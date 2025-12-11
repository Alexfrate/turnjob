/**
 * Validatore Preferenze Collaboratori
 *
 * Workflow:
 * 1. Check periodo critico → Se bloccato → REJECTED_CRITICAL
 * 2. Check conflitto nucleo → Se occupato → REJECTED_CONFLICT
 * 3. Check vincoli → Se viola → REJECTED_CONSTRAINT
 * 4. Altrimenti → APPROVED
 */

import { createClient } from '@/lib/supabase/server';
import type {
  PreferenzaTurno,
  ValidationResult,
  PreferenceValidationStatus,
  ConflictCheckResult,
  CriticalPeriodCheckResult,
  ConstraintCheckResult,
  ConstraintViolation,
  PeriodoCritico,
  Assegnazione,
} from '../types';

export class PreferenceValidator {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Valida una preferenza collaboratore
   */
  async validate(
    preferenza: Partial<PreferenzaTurno> & {
      collaboratore_id: string;
      data: string;
      ora_inizio?: string;
      ora_fine?: string;
    }
  ): Promise<ValidationResult> {
    const supabase = await this.getClient();

    // 1. Ottieni info collaboratore
    const { data: collaboratore, error: collabError } = await supabase
      .from('Collaboratore')
      .select('id, nome, cognome, nucleo_id, azienda_id')
      .eq('id', preferenza.collaboratore_id)
      .single();

    if (collabError || !collaboratore) {
      return {
        isValid: false,
        status: 'REJECTED_CONSTRAINT',
        reason: 'Collaboratore non trovato',
      };
    }

    // 2. Check periodo critico
    const criticalCheck = await this.checkCriticalPeriod(
      collaboratore.azienda_id,
      preferenza.data,
      preferenza.ora_inizio,
      preferenza.ora_fine
    );

    if (criticalCheck.isInCriticalPeriod && criticalCheck.isBlocked) {
      return {
        isValid: false,
        status: 'REJECTED_CRITICAL',
        reason: `Periodo critico: ${criticalCheck.period?.nome}. Le preferenze sono bloccate.`,
        details: [
          {
            type: 'critical_period',
            message: `Dal ${criticalCheck.period?.data_inizio} al ${criticalCheck.period?.data_fine}`,
            severity: 'error',
            relatedEntityId: criticalCheck.period?.id,
          },
        ],
      };
    }

    // 3. Check conflitto stesso nucleo (se tipo = UNAVAILABLE, non serve)
    if (preferenza.tipo !== 'UNAVAILABLE') {
      const conflictCheck = await this.checkNucleoConflict(
        collaboratore.nucleo_id,
        preferenza.collaboratore_id,
        preferenza.data,
        preferenza.ora_inizio,
        preferenza.ora_fine
      );

      if (conflictCheck.hasConflict) {
        const conflictNames = conflictCheck.conflictingAssignments
          .map((a) => a.collaboratore_id)
          .join(', ');

        return {
          isValid: false,
          status: 'REJECTED_CONFLICT',
          reason: `Slot già occupato da altro collaboratore dello stesso nucleo`,
          details: conflictCheck.conflictingAssignments.map((a) => ({
            type: 'conflict' as const,
            message: `Assegnazione esistente per il ${a.data}`,
            severity: 'error' as const,
            relatedEntityId: a.id,
          })),
        };
      }
    }

    // 4. Check vincoli (ore settimanali, riposo minimo, etc.)
    const constraintCheck = await this.checkConstraints(
      collaboratore.azienda_id,
      preferenza.collaboratore_id,
      preferenza.data,
      preferenza.ora_inizio,
      preferenza.ora_fine
    );

    if (constraintCheck.hasHardViolation) {
      const hardViolations = constraintCheck.violations.filter(
        (v) => v.severity === 'HARD'
      );
      return {
        isValid: false,
        status: 'REJECTED_CONSTRAINT',
        reason: hardViolations[0]?.message || 'Vincolo violato',
        details: hardViolations.map((v) => ({
          type: 'constraint' as const,
          message: v.message,
          severity: 'error' as const,
          relatedEntityId: v.vincolo.id,
        })),
      };
    }

    // 5. Tutto OK - APPROVED
    return {
      isValid: true,
      status: 'APPROVED',
      details: constraintCheck.violations
        .filter((v) => v.severity === 'SOFT')
        .map((v) => ({
          type: 'constraint' as const,
          message: v.message,
          severity: 'warning' as const,
          relatedEntityId: v.vincolo.id,
        })),
    };
  }

  /**
   * Verifica se la data cade in un periodo critico con preferenze bloccate
   */
  async checkCriticalPeriod(
    azienda_id: string,
    data: string,
    ora_inizio?: string,
    ora_fine?: string
  ): Promise<CriticalPeriodCheckResult> {
    const supabase = await this.getClient();

    const { data: periodi, error } = await supabase
      .from('PeriodoCritico')
      .select('*')
      .eq('azienda_id', azienda_id)
      .eq('attivo', true)
      .lte('data_inizio', data)
      .gte('data_fine', data);

    if (error || !periodi || periodi.length === 0) {
      return { isInCriticalPeriod: false, isBlocked: false };
    }

    // Trova il periodo critico applicabile
    for (const periodo of periodi) {
      // Check orario se specificato
      if (periodo.ora_inizio && periodo.ora_fine && ora_inizio && ora_fine) {
        const periodoStart = this.timeToMinutes(periodo.ora_inizio);
        const periodoEnd = this.timeToMinutes(periodo.ora_fine);
        const prefStart = this.timeToMinutes(ora_inizio);
        const prefEnd = this.timeToMinutes(ora_fine);

        // Verifica sovrapposizione oraria
        if (prefStart >= periodoEnd || prefEnd <= periodoStart) {
          continue; // Non si sovrappone
        }
      }

      return {
        isInCriticalPeriod: true,
        period: periodo as PeriodoCritico,
        isBlocked: periodo.blocca_preferenze,
      };
    }

    return { isInCriticalPeriod: false, isBlocked: false };
  }

  /**
   * Verifica se ci sono conflitti con altri collaboratori dello stesso nucleo
   */
  async checkNucleoConflict(
    nucleo_id: string,
    collaboratore_id: string,
    data: string,
    ora_inizio?: string,
    ora_fine?: string
  ): Promise<ConflictCheckResult> {
    const supabase = await this.getClient();

    // 1. Trova tutti i collaboratori dello stesso nucleo (escluso quello corrente)
    const { data: colleghiNucleo, error: colleghiError } = await supabase
      .from('Collaboratore')
      .select('id')
      .eq('nucleo_id', nucleo_id)
      .eq('attivo', true)
      .neq('id', collaboratore_id);

    if (colleghiError || !colleghiNucleo || colleghiNucleo.length === 0) {
      return {
        hasConflict: false,
        conflictingAssignments: [],
        conflictingPreferences: [],
      };
    }

    const colleghiIds = colleghiNucleo.map((c) => c.id);

    // 2. Verifica assegnazioni esistenti dei colleghi per quella data
    const { data: assegnazioni, error: assegnazioniError } = await supabase
      .from('Assegnazione')
      .select('*')
      .in('collaboratore_id', colleghiIds)
      .eq('data', data)
      .neq('stato', 'annullato');

    if (assegnazioniError) {
      console.error('Errore check assegnazioni:', assegnazioniError);
      return {
        hasConflict: false,
        conflictingAssignments: [],
        conflictingPreferences: [],
      };
    }

    // 3. Filtra per sovrapposizione oraria se specificato
    const conflictingAssignments = (assegnazioni || []).filter((a) => {
      if (!ora_inizio || !ora_fine) return true; // Tutto il giorno

      const aStart = this.timeToMinutes(a.ora_inizio_override || '00:00');
      const aEnd = this.timeToMinutes(a.ora_fine_override || '23:59');
      const pStart = this.timeToMinutes(ora_inizio);
      const pEnd = this.timeToMinutes(ora_fine);

      // Verifica sovrapposizione
      return !(pStart >= aEnd || pEnd <= aStart);
    }) as Assegnazione[];

    // 4. Verifica anche preferenze approvate dei colleghi
    const { data: preferenzeColleghi } = await supabase
      .from('PreferenzaTurno')
      .select('*')
      .in('collaboratore_id', colleghiIds)
      .eq('data', data)
      .eq('stato_validazione', 'APPROVED')
      .in('tipo', ['AVAILABLE', 'PREFERRED']);

    const conflictingPreferences = (preferenzeColleghi || []).filter((p) => {
      if (!ora_inizio || !ora_fine || !p.ora_inizio || !p.ora_fine) return true;

      const pStart = this.timeToMinutes(p.ora_inizio);
      const pEnd = this.timeToMinutes(p.ora_fine);
      const reqStart = this.timeToMinutes(ora_inizio);
      const reqEnd = this.timeToMinutes(ora_fine);

      return !(reqStart >= pEnd || reqEnd <= pStart);
    }) as PreferenzaTurno[];

    return {
      hasConflict:
        conflictingAssignments.length > 0 || conflictingPreferences.length > 0,
      conflictingAssignments,
      conflictingPreferences,
    };
  }

  /**
   * Verifica vincoli (ore settimanali, riposo minimo, etc.)
   */
  async checkConstraints(
    azienda_id: string,
    collaboratore_id: string,
    data: string,
    ora_inizio?: string,
    ora_fine?: string
  ): Promise<ConstraintCheckResult> {
    const supabase = await this.getClient();
    const violations: ConstraintViolation[] = [];

    // Ottieni vincoli attivi (predefiniti + azienda)
    const { data: vincoli, error: vincoliError } = await supabase
      .from('TemplateVincolo')
      .select('*')
      .eq('attivo', true)
      .or(`azienda_id.eq.${azienda_id},predefinito.eq.true`);

    if (vincoliError || !vincoli) {
      return { violations: [], hasHardViolation: false };
    }

    // Check vincolo ore massime settimanali
    const oreMaxVincolo = vincoli.find(
      (v) => v.regola?.tipo === 'ore_max_settimanali'
    );
    if (oreMaxVincolo && ora_inizio && ora_fine) {
      const oreRichieste =
        (this.timeToMinutes(ora_fine) - this.timeToMinutes(ora_inizio)) / 60;
      const oreSettimana = await this.getOreSettimana(collaboratore_id, data);

      const maxOre = oreMaxVincolo.regola?.ore || 48;
      if (oreSettimana + oreRichieste > maxOre) {
        violations.push({
          vincolo: oreMaxVincolo,
          message: `Superato limite ore settimanali (${oreSettimana + oreRichieste}h > ${maxOre}h)`,
          severity: oreMaxVincolo.tipo_vincolo as 'HARD' | 'SOFT',
        });
      }
    }

    // Check vincolo riposo minimo
    const riposoVincolo = vincoli.find(
      (v) => v.regola?.tipo === 'riposo_minimo'
    );
    if (riposoVincolo && ora_inizio) {
      const riposoOk = await this.checkRiposoMinimo(
        collaboratore_id,
        data,
        ora_inizio,
        riposoVincolo.regola?.ore || 11
      );

      if (!riposoOk) {
        violations.push({
          vincolo: riposoVincolo,
          message: `Non rispettato riposo minimo di ${riposoVincolo.regola?.ore || 11} ore`,
          severity: riposoVincolo.tipo_vincolo as 'HARD' | 'SOFT',
        });
      }
    }

    return {
      violations,
      hasHardViolation: violations.some((v) => v.severity === 'HARD'),
    };
  }

  /**
   * Calcola ore lavorate nella settimana della data
   */
  private async getOreSettimana(
    collaboratore_id: string,
    data: string
  ): Promise<number> {
    const supabase = await this.getClient();

    // Calcola inizio e fine settimana
    const dataObj = new Date(data);
    const dayOfWeek = dataObj.getDay();
    const startOfWeek = new Date(dataObj);
    startOfWeek.setDate(dataObj.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const { data: assegnazioni } = await supabase
      .from('Assegnazione')
      .select('ora_inizio_override, ora_fine_override, Turno(ora_inizio, ora_fine)')
      .eq('collaboratore_id', collaboratore_id)
      .gte('data', startOfWeek.toISOString().split('T')[0])
      .lte('data', endOfWeek.toISOString().split('T')[0])
      .neq('stato', 'annullato');

    if (!assegnazioni) return 0;

    let totaleMinuti = 0;
    for (const a of assegnazioni) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const turnoData = a.Turno as any;
      const turno = Array.isArray(turnoData) ? turnoData[0] : turnoData;
      const oraInizio = a.ora_inizio_override || turno?.ora_inizio || '00:00';
      const oraFine = a.ora_fine_override || turno?.ora_fine || '00:00';
      totaleMinuti += this.timeToMinutes(oraFine) - this.timeToMinutes(oraInizio);
    }

    return totaleMinuti / 60;
  }

  /**
   * Verifica che ci sia riposo minimo dal turno precedente
   */
  private async checkRiposoMinimo(
    collaboratore_id: string,
    data: string,
    ora_inizio: string,
    ore_riposo: number
  ): Promise<boolean> {
    const supabase = await this.getClient();

    // Ottieni ultimo turno del giorno precedente
    const ieri = new Date(data);
    ieri.setDate(ieri.getDate() - 1);
    const ieriStr = ieri.toISOString().split('T')[0];

    const { data: ultimoTurno } = await supabase
      .from('Assegnazione')
      .select('ora_fine_override, Turno(ora_fine)')
      .eq('collaboratore_id', collaboratore_id)
      .eq('data', ieriStr)
      .neq('stato', 'annullato')
      .order('ora_fine_override', { ascending: false })
      .limit(1)
      .single();

    if (!ultimoTurno) return true; // Nessun turno ieri, ok

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turnoData = ultimoTurno.Turno as any;
    const turno = Array.isArray(turnoData) ? turnoData[0] : turnoData;
    const fineIeri = ultimoTurno.ora_fine_override || turno?.ora_fine || '23:59';

    // Calcola ore di riposo
    const fineIeriMinuti = this.timeToMinutes(fineIeri);
    const inizioOggiMinuti = this.timeToMinutes(ora_inizio);

    // Minuti da mezzanotte a fine turno ieri + minuti da mezzanotte a inizio oggi
    const minutiRiposo = (24 * 60 - fineIeriMinuti) + inizioOggiMinuti;
    const oreRiposo = minutiRiposo / 60;

    return oreRiposo >= ore_riposo;
  }

  /**
   * Utility: converte "HH:MM" in minuti
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
}

// Singleton instance
let validatorInstance: PreferenceValidator | null = null;

export function getPreferenceValidator(): PreferenceValidator {
  if (!validatorInstance) {
    validatorInstance = new PreferenceValidator();
  }
  return validatorInstance;
}
