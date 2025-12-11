/**
 * AI Scheduling Engine
 *
 * Orchestratore principale per la generazione intelligente dei turni.
 * Supporta tre modalità:
 * - SUGGESTION: AI propone, admin approva singolarmente
 * - SEMI_AUTOMATIC: AI genera bozza settimanale, admin rivede
 * - AUTONOMOUS: AI genera e pubblica se confidence >= soglia
 */

import { createClient } from '@/lib/supabase/server';
import { generateWithRouter } from '../router';
import { getPreferenceValidator } from './validators/preference-validator';
import { getConflictDetector } from './validators/conflict-detector';
import { z } from 'zod';
import type {
  AISchedulingConfig,
  GenerationRequest,
  GenerationResult,
  GeneratedShift,
  ProposedAssignment,
  GenerationWarning,
  GenerationMetrics,
  PeriodoCritico,
  TemplateVincolo,
  Collaboratore,
  Nucleo,
  Turno,
} from './types';

// Schema per risposta AI generazione turni
const AIGenerationResponseSchema = z.object({
  turni: z.array(
    z.object({
      nucleo_id: z.string(),
      data: z.string(),
      ora_inizio: z.string(),
      ora_fine: z.string(),
      staff_richiesto: z.number(),
      reasoning: z.string().optional(),
    })
  ),
  assegnazioni: z.array(
    z.object({
      nucleo_id: z.string(),
      collaboratore_id: z.string(),
      data: z.string(),
      ora_inizio: z.string(),
      ora_fine: z.string(),
      reasoning: z.string().optional(),
    })
  ),
  warnings: z.array(z.string()).optional(),
  overall_confidence: z.number(),
});

export class AISchedulingEngine {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  private preferenceValidator = getPreferenceValidator();
  private conflictDetector = getConflictDetector();

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Genera turni e assegnazioni per un periodo
   */
  async generateSchedule(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const supabase = await this.getClient();

    try {
      // 1. Ottieni configurazione AI per l'azienda
      const config = await this.getConfig(request.azienda_id);
      if (!config || config.modalita_ai === 'DISABLED') {
        throw new Error('AI Scheduling non abilitato per questa azienda');
      }

      // 2. Raccogli contesto
      const context = await this.gatherContext(request);

      // 3. Genera prompt per AI
      const prompt = this.buildGenerationPrompt(request, context, config);

      // 4. Chiama AI
      const aiResponse = await generateWithRouter(
        'constraint', // Usa il modello per constraint/scheduling
        prompt,
        AIGenerationResponseSchema,
        request.azienda_id
      );

      // 5. Valida e filtra risultati
      const validatedResult = await this.validateAndFilterResults(
        aiResponse,
        request,
        config
      );

      // 6. Calcola metriche
      const metriche: GenerationMetrics = {
        tempo_esecuzione_ms: Date.now() - startTime,
        confidenza_media: aiResponse.overall_confidence,
        vincoli_hard_rispettati: validatedResult.vincoli_hard_ok,
        vincoli_soft_rispettati: validatedResult.vincoli_soft_ok,
        preferenze_soddisfatte: validatedResult.preferenze_ok,
        preferenze_totali: validatedResult.preferenze_totali,
      };

      // 7. Salva log generazione
      await this.logGeneration(request, validatedResult, metriche);

      return {
        success: true,
        turni_generati: validatedResult.turni,
        assegnazioni_proposte: validatedResult.assegnazioni,
        warnings: validatedResult.warnings,
        metriche,
      };
    } catch (error) {
      console.error('AI Generation error:', error);

      // Log errore
      await this.logGenerationError(request, error as Error, Date.now() - startTime);

      return {
        success: false,
        turni_generati: [],
        assegnazioni_proposte: [],
        warnings: [
          {
            type: 'understaffed',
            message: `Errore generazione AI: ${(error as Error).message}`,
          },
        ],
        metriche: {
          tempo_esecuzione_ms: Date.now() - startTime,
          confidenza_media: 0,
          vincoli_hard_rispettati: 0,
          vincoli_soft_rispettati: 0,
          preferenze_soddisfatte: 0,
          preferenze_totali: 0,
        },
      };
    }
  }

  /**
   * Ottieni configurazione AI per azienda
   */
  async getConfig(azienda_id: string): Promise<AISchedulingConfig | null> {
    const supabase = await this.getClient();

    const { data } = await supabase
      .from('ConfigurazioneAIScheduling')
      .select('*')
      .eq('azienda_id', azienda_id)
      .single();

    return data as AISchedulingConfig | null;
  }

  /**
   * Crea o aggiorna configurazione AI
   */
  async upsertConfig(
    azienda_id: string,
    config: Partial<AISchedulingConfig>
  ): Promise<AISchedulingConfig> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from('ConfigurazioneAIScheduling')
      .upsert(
        { azienda_id, ...config, updated_at: new Date().toISOString() },
        { onConflict: 'azienda_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as AISchedulingConfig;
  }

  /**
   * Raccoglie tutto il contesto necessario per la generazione
   */
  private async gatherContext(request: GenerationRequest) {
    const supabase = await this.getClient();

    // Nuclei
    let nucleiQuery = supabase
      .from('Nucleo')
      .select('*')
      .eq('azienda_id', request.azienda_id)
      .eq('attivo', true);

    if (request.nucleo_ids && request.nucleo_ids.length > 0) {
      nucleiQuery = nucleiQuery.in('id', request.nucleo_ids);
    }

    const { data: nuclei } = await nucleiQuery;

    // Collaboratori per nuclei
    const nucleoIds = (nuclei || []).map((n) => n.id);
    const { data: collaboratori } = await supabase
      .from('Collaboratore')
      .select('*')
      .in('nucleo_id', nucleoIds)
      .eq('attivo', true);

    // Turni template
    const { data: turniTemplate } = await supabase
      .from('Turno')
      .select('*')
      .in('nucleo_id', nucleoIds)
      .eq('attivo', true);

    // Periodi critici nel range
    const { data: periodiCritici } = await supabase
      .from('PeriodoCritico')
      .select('*')
      .eq('azienda_id', request.azienda_id)
      .eq('attivo', true)
      .lte('data_inizio', request.data_fine)
      .gte('data_fine', request.data_inizio);

    // Vincoli attivi
    const { data: vincoli } = await supabase
      .from('TemplateVincolo')
      .select('*')
      .eq('attivo', true)
      .or(`azienda_id.eq.${request.azienda_id},predefinito.eq.true`);

    // Preferenze approvate nel periodo
    const collaboratoriIds = (collaboratori || []).map((c) => c.id);
    const { data: preferenze } = await supabase
      .from('PreferenzaTurno')
      .select('*')
      .in('collaboratore_id', collaboratoriIds)
      .eq('stato_validazione', 'APPROVED')
      .gte('data', request.data_inizio)
      .lte('data', request.data_fine);

    // Richieste ferie/permessi approvate nel periodo
    const { data: richieste } = await supabase
      .from('Richiesta')
      .select('*')
      .in('collaboratore_id', collaboratoriIds)
      .eq('stato', 'approvata')
      .lte('data_inizio', request.data_fine)
      .gte('data_fine', request.data_inizio);

    // Assegnazioni esistenti nel periodo
    const { data: assegnazioniEsistenti } = await supabase
      .from('Assegnazione')
      .select('*')
      .in('collaboratore_id', collaboratoriIds)
      .gte('data', request.data_inizio)
      .lte('data', request.data_fine)
      .neq('stato', 'annullato');

    return {
      nuclei: (nuclei || []) as Nucleo[],
      collaboratori: (collaboratori || []) as Collaboratore[],
      turniTemplate: (turniTemplate || []) as Turno[],
      periodiCritici: (periodiCritici || []) as PeriodoCritico[],
      vincoli: (vincoli || []) as TemplateVincolo[],
      preferenze: preferenze || [],
      richieste: richieste || [],
      assegnazioniEsistenti: assegnazioniEsistenti || [],
    };
  }

  /**
   * Costruisce il prompt per l'AI
   */
  private buildGenerationPrompt(
    request: GenerationRequest,
    context: Awaited<ReturnType<typeof this.gatherContext>>,
    config: AISchedulingConfig
  ): string {
    const vincoliHard = context.vincoli.filter((v) => v.tipo_vincolo === 'HARD');
    const vincoliSoft = context.vincoli.filter((v) => v.tipo_vincolo === 'SOFT');

    return `
Sei un esperto di gestione turni. Genera un piano di turni ottimale.

## PERIODO
- Da: ${request.data_inizio}
- A: ${request.data_fine}

## NUCLEI E COLLABORATORI
${context.nuclei
  .map((n) => {
    const collabNucleo = context.collaboratori.filter((c) => c.nucleo_id === n.id);
    return `
### ${n.nome}
Collaboratori: ${collabNucleo.map((c) => `${c.nome} ${c.cognome} (${c.ore_settimanali_contratto || 40}h/sett)`).join(', ')}
`;
  })
  .join('\n')}

## TURNI TEMPLATE
${context.turniTemplate.map((t) => `- ${t.nome}: ${t.ora_inizio}-${t.ora_fine} (giorni: ${t.giorni_settimana.join(',')})`).join('\n')}

## VINCOLI OBBLIGATORI (HARD)
${vincoliHard.map((v) => `- ${v.nome}: ${v.descrizione}`).join('\n')}

## VINCOLI PREFERENZIALI (SOFT)
${vincoliSoft.map((v) => `- ${v.nome}: ${v.descrizione}`).join('\n')}

## PERIODI CRITICI
${
  context.periodiCritici.length > 0
    ? context.periodiCritici
        .map(
          (p) =>
            `- ${p.nome}: ${p.data_inizio} - ${p.data_fine} (moltiplicatore staff: ${p.moltiplicatore_staff}x)`
        )
        .join('\n')
    : 'Nessun periodo critico nel range'
}

## PREFERENZE COLLABORATORI
${
  context.preferenze.length > 0
    ? context.preferenze
        .map((p) => {
          const collab = context.collaboratori.find((c) => c.id === p.collaboratore_id);
          return `- ${collab?.nome || 'N/A'}: ${p.data} ${p.ora_inizio || ''}-${p.ora_fine || ''} (${p.tipo})`;
        })
        .join('\n')
    : 'Nessuna preferenza espressa'
}

## ASSENZE APPROVATE (Ferie/Permessi)
${
  context.richieste.length > 0
    ? context.richieste
        .map((r) => {
          const collab = context.collaboratori.find((c) => c.id === r.collaboratore_id);
          return `- ${collab?.nome || 'N/A'}: ${r.tipo} dal ${r.data_inizio} al ${r.data_fine}`;
        })
        .join('\n')
    : 'Nessuna assenza nel periodo'
}

## CONFIGURAZIONE
- Considera preferenze: ${config.considera_preferenze ? 'Sì' : 'No'}
- Max ore settimanali: ${config.max_ore_settimanali}h
- Min ore riposo: ${config.min_ore_riposo}h

## ISTRUZIONI
1. Genera turni per ogni giorno del periodo secondo i template
2. Durante periodi critici, aumenta lo staff secondo il moltiplicatore
3. Assegna collaboratori rispettando:
   - SEMPRE i vincoli HARD (riposo minimo, ore max)
   - Preferibilmente i vincoli SOFT
   - Le preferenze dei collaboratori quando possibile
   - Le assenze approvate
4. Distribuisci equamente le ore tra i collaboratori
5. Non assegnare lo stesso collaboratore a turni sovrapposti

Rispondi con un JSON contenente turni, assegnazioni, warnings e overall_confidence (0-1).
`;
  }

  /**
   * Valida i risultati AI e filtra quelli non validi
   */
  private async validateAndFilterResults(
    aiResponse: z.infer<typeof AIGenerationResponseSchema>,
    request: GenerationRequest,
    config: AISchedulingConfig
  ) {
    const turni: GeneratedShift[] = [];
    const assegnazioni: ProposedAssignment[] = [];
    const warnings: GenerationWarning[] = [];

    let vincoli_hard_ok = 0;
    let vincoli_soft_ok = 0;
    let preferenze_ok = 0;
    let preferenze_totali = 0;

    // Valida turni
    for (const turno of aiResponse.turni) {
      turni.push({
        nucleo_id: turno.nucleo_id,
        data: turno.data,
        ora_inizio: turno.ora_inizio,
        ora_fine: turno.ora_fine,
        staff_richiesto: turno.staff_richiesto,
        confidenza: aiResponse.overall_confidence,
        reasoning: turno.reasoning,
      });
    }

    // Valida assegnazioni
    for (const ass of aiResponse.assegnazioni) {
      // Check conflitti
      const conflicts = await this.conflictDetector.detectConflicts({
        nucleo_id: ass.nucleo_id,
        data: ass.data,
        ora_inizio: ass.ora_inizio,
        ora_fine: ass.ora_fine,
        exclude_collaboratore_id: ass.collaboratore_id,
      });

      if (conflicts.hasConflicts) {
        warnings.push({
          type: 'constraint_soft_violation',
          message: `Conflitto rilevato per assegnazione ${ass.data}: ${conflicts.conflicts[0]?.descrizione}`,
          data: ass.data,
          nucleo_id: ass.nucleo_id,
        });
        continue;
      }

      // Valida con preference validator
      const validation = await this.preferenceValidator.validate({
        collaboratore_id: ass.collaboratore_id,
        data: ass.data,
        ora_inizio: ass.ora_inizio,
        ora_fine: ass.ora_fine,
        tipo: 'AVAILABLE',
      });

      if (validation.status === 'REJECTED_CONSTRAINT') {
        warnings.push({
          type: 'constraint_soft_violation',
          message: validation.reason || 'Vincolo violato',
          data: ass.data,
        });
        continue;
      }

      vincoli_hard_ok++;
      if (validation.isValid) {
        vincoli_soft_ok++;
      }

      assegnazioni.push({
        collaboratore_id: ass.collaboratore_id,
        data: ass.data,
        ora_inizio: ass.ora_inizio,
        ora_fine: ass.ora_fine,
        confidenza: aiResponse.overall_confidence,
        reasoning: ass.reasoning,
      });
    }

    // Aggiungi warnings da AI
    if (aiResponse.warnings) {
      for (const w of aiResponse.warnings) {
        warnings.push({
          type: 'understaffed',
          message: w,
        });
      }
    }

    return {
      turni,
      assegnazioni,
      warnings,
      vincoli_hard_ok,
      vincoli_soft_ok,
      preferenze_ok,
      preferenze_totali,
    };
  }

  /**
   * Salva log generazione
   */
  private async logGeneration(
    request: GenerationRequest,
    result: Awaited<ReturnType<typeof this.validateAndFilterResults>>,
    metriche: GenerationMetrics
  ) {
    const supabase = await this.getClient();

    await supabase.from('GenerazioneAI').insert({
      azienda_id: request.azienda_id,
      data_inizio_periodo: request.data_inizio,
      data_fine_periodo: request.data_fine,
      modalita: 'SEMI_AUTOMATIC',
      stato: 'completato',
      turni_generati: result.turni.length,
      conflitti_rilevati: result.warnings.length,
      confidenza_media: metriche.confidenza_media,
      tempo_esecuzione_ms: metriche.tempo_esecuzione_ms,
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Salva log errore generazione
   */
  private async logGenerationError(
    request: GenerationRequest,
    error: Error,
    durationMs: number
  ) {
    const supabase = await this.getClient();

    await supabase.from('GenerazioneAI').insert({
      azienda_id: request.azienda_id,
      data_inizio_periodo: request.data_inizio,
      data_fine_periodo: request.data_fine,
      modalita: 'SEMI_AUTOMATIC',
      stato: 'errore',
      errore: error.message,
      tempo_esecuzione_ms: durationMs,
    });
  }
}

// Singleton
let engineInstance: AISchedulingEngine | null = null;

export function getAISchedulingEngine(): AISchedulingEngine {
  if (!engineInstance) {
    engineInstance = new AISchedulingEngine();
  }
  return engineInstance;
}
