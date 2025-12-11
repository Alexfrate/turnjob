/**
 * Rilevatore Conflitti Turni
 *
 * Rileva conflitti tra:
 * - Assegnazioni esistenti
 * - Preferenze approvate
 * - Richieste ferie/permessi approvate
 */

import { createClient } from '@/lib/supabase/server';
import type { Assegnazione, PreferenzaTurno } from '../types';

export interface ConflictInfo {
  tipo: 'assegnazione' | 'preferenza' | 'richiesta';
  entita_id: string;
  collaboratore_id: string;
  collaboratore_nome?: string;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  descrizione: string;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
  suggestions?: string[];
}

export class ConflictDetector {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Rileva tutti i conflitti per un potenziale turno/assegnazione
   */
  async detectConflicts(params: {
    nucleo_id: string;
    data: string;
    ora_inizio: string;
    ora_fine: string;
    exclude_collaboratore_id?: string; // Per escludere il collaboratore corrente
    exclude_assegnazione_id?: string; // Per escludere assegnazione corrente (edit)
  }): Promise<ConflictDetectionResult> {
    const supabase = await this.getClient();
    const conflicts: ConflictInfo[] = [];

    // 1. Trova collaboratori del nucleo
    const { data: collaboratori } = await supabase
      .from('Collaboratore')
      .select('id, nome, cognome')
      .eq('nucleo_id', params.nucleo_id)
      .eq('attivo', true);

    if (!collaboratori || collaboratori.length === 0) {
      return { hasConflicts: false, conflicts: [] };
    }

    const collaboratoriIds = collaboratori
      .filter((c) => c.id !== params.exclude_collaboratore_id)
      .map((c) => c.id);

    const collaboratoriMap = new Map(
      collaboratori.map((c) => [c.id, `${c.nome} ${c.cognome}`])
    );

    // 2. Check assegnazioni esistenti
    let assegnazioniQuery = supabase
      .from('Assegnazione')
      .select('*, Turno(ora_inizio, ora_fine)')
      .in('collaboratore_id', collaboratoriIds)
      .eq('data', params.data)
      .neq('stato', 'annullato');

    if (params.exclude_assegnazione_id) {
      assegnazioniQuery = assegnazioniQuery.neq('id', params.exclude_assegnazione_id);
    }

    const { data: assegnazioni } = await assegnazioniQuery;

    if (assegnazioni) {
      for (const a of assegnazioni) {
        const turno = a.Turno as { ora_inizio: string; ora_fine: string } | null;
        const aInizio = a.ora_inizio_override || turno?.ora_inizio || '00:00';
        const aFine = a.ora_fine_override || turno?.ora_fine || '23:59';

        if (this.timeRangesOverlap(params.ora_inizio, params.ora_fine, aInizio, aFine)) {
          conflicts.push({
            tipo: 'assegnazione',
            entita_id: a.id,
            collaboratore_id: a.collaboratore_id,
            collaboratore_nome: collaboratoriMap.get(a.collaboratore_id),
            data: a.data,
            ora_inizio: aInizio,
            ora_fine: aFine,
            descrizione: `${collaboratoriMap.get(a.collaboratore_id)} già assegnato ${aInizio}-${aFine}`,
          });
        }
      }
    }

    // 3. Check preferenze approvate AVAILABLE/PREFERRED
    const { data: preferenze } = await supabase
      .from('PreferenzaTurno')
      .select('*')
      .in('collaboratore_id', collaboratoriIds)
      .eq('data', params.data)
      .eq('stato_validazione', 'APPROVED')
      .in('tipo', ['AVAILABLE', 'PREFERRED']);

    if (preferenze) {
      for (const p of preferenze) {
        const pInizio = p.ora_inizio || '00:00';
        const pFine = p.ora_fine || '23:59';

        if (this.timeRangesOverlap(params.ora_inizio, params.ora_fine, pInizio, pFine)) {
          conflicts.push({
            tipo: 'preferenza',
            entita_id: p.id,
            collaboratore_id: p.collaboratore_id,
            collaboratore_nome: collaboratoriMap.get(p.collaboratore_id),
            data: p.data,
            ora_inizio: pInizio,
            ora_fine: pFine,
            descrizione: `${collaboratoriMap.get(p.collaboratore_id)} ha preferenza ${p.tipo} ${pInizio}-${pFine}`,
          });
        }
      }
    }

    // 4. Check richieste ferie/permessi approvate
    const { data: richieste } = await supabase
      .from('Richiesta')
      .select('*')
      .in('collaboratore_id', collaboratoriIds)
      .eq('stato', 'approvata')
      .lte('data_inizio', params.data)
      .gte('data_fine', params.data);

    if (richieste) {
      for (const r of richieste) {
        conflicts.push({
          tipo: 'richiesta',
          entita_id: r.id,
          collaboratore_id: r.collaboratore_id,
          collaboratore_nome: collaboratoriMap.get(r.collaboratore_id),
          data: params.data,
          descrizione: `${collaboratoriMap.get(r.collaboratore_id)} in ${r.tipo} (${r.data_inizio} - ${r.data_fine})`,
        });
      }
    }

    // Genera suggerimenti
    const suggestions: string[] = [];
    if (conflicts.length > 0) {
      const collaboratoriDisponibili = collaboratori.filter(
        (c) => !conflicts.some((conf) => conf.collaboratore_id === c.id)
      );

      if (collaboratoriDisponibili.length > 0) {
        suggestions.push(
          `Collaboratori disponibili: ${collaboratoriDisponibili.map((c) => `${c.nome} ${c.cognome}`).join(', ')}`
        );
      } else {
        suggestions.push(
          'Nessun collaboratore disponibile in questo nucleo per questo orario'
        );
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      suggestions,
    };
  }

  /**
   * Trova collaboratori disponibili per un turno
   */
  async findAvailableCollaborators(params: {
    nucleo_id: string;
    data: string;
    ora_inizio: string;
    ora_fine: string;
  }): Promise<{
    id: string;
    nome: string;
    cognome: string;
    score: number; // 0-100, quanto è adatto
    reason?: string;
  }[]> {
    const supabase = await this.getClient();

    // 1. Ottieni tutti i collaboratori del nucleo
    const { data: collaboratori } = await supabase
      .from('Collaboratore')
      .select('id, nome, cognome, ore_settimanali_contratto')
      .eq('nucleo_id', params.nucleo_id)
      .eq('attivo', true);

    if (!collaboratori) return [];

    const risultati: {
      id: string;
      nome: string;
      cognome: string;
      score: number;
      reason?: string;
    }[] = [];

    for (const collab of collaboratori) {
      // Check se ha conflitti
      const conflictResult = await this.detectConflicts({
        ...params,
        exclude_collaboratore_id: collab.id,
      });

      // Se il collaboratore ha un conflitto diretto, skip
      const haDirectConflict = conflictResult.conflicts.some(
        (c) => c.collaboratore_id === collab.id
      );

      if (haDirectConflict) {
        continue;
      }

      // Check richieste ferie/permessi
      const { data: richieste } = await supabase
        .from('Richiesta')
        .select('id')
        .eq('collaboratore_id', collab.id)
        .eq('stato', 'approvata')
        .lte('data_inizio', params.data)
        .gte('data_fine', params.data)
        .limit(1);

      if (richieste && richieste.length > 0) {
        continue; // In ferie/permesso
      }

      // Check preferenze
      const { data: preferenze } = await supabase
        .from('PreferenzaTurno')
        .select('tipo')
        .eq('collaboratore_id', collab.id)
        .eq('data', params.data)
        .eq('stato_validazione', 'APPROVED');

      let score = 50; // Base score
      let reason = 'Disponibile';

      if (preferenze && preferenze.length > 0) {
        const pref = preferenze[0];
        if (pref.tipo === 'PREFERRED') {
          score = 90;
          reason = 'Preferisce questo turno';
        } else if (pref.tipo === 'AVAILABLE') {
          score = 70;
          reason = 'Si è dichiarato disponibile';
        } else if (pref.tipo === 'UNAVAILABLE') {
          score = 10;
          reason = 'Ha indicato indisponibilità (soft)';
        }
      }

      risultati.push({
        id: collab.id,
        nome: collab.nome,
        cognome: collab.cognome,
        score,
        reason,
      });
    }

    // Ordina per score decrescente
    return risultati.sort((a, b) => b.score - a.score);
  }

  /**
   * Verifica sovrapposizione di range orari
   */
  private timeRangesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const s1 = this.timeToMinutes(start1);
    const e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    const e2 = this.timeToMinutes(end2);

    return !(e1 <= s2 || e2 <= s1);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
}

// Singleton
let detectorInstance: ConflictDetector | null = null;

export function getConflictDetector(): ConflictDetector {
  if (!detectorInstance) {
    detectorInstance = new ConflictDetector();
  }
  return detectorInstance;
}
