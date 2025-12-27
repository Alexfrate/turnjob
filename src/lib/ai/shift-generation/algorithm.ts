/**
 * Algoritmo di generazione turni settimanali
 *
 * Genera turni ottimali rispettando:
 * - Vincoli HARD: riposi, ferie, ore max, copertura minima, appartenenza nuclei
 * - Vincoli SOFT: preferenze, distribuzione equa, pattern storici
 */

import type {
  GenerationContext,
  GeneratedShift,
  CollaboratoreSuggerito,
  WeekGenerationResult,
  CoverageStats,
  WorkloadDistribution,
  GenerationWarning,
  DisponibilitaGiorno,
} from './types';

// Giorni della settimana (1=Lunedì, 7=Domenica)
const GIORNI_SETTIMANA = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

/**
 * Genera i turni per l'intera settimana
 */
export function generateWeekShifts(context: GenerationContext): WeekGenerationResult {
  const turni: GeneratedShift[] = [];
  const warnings: GenerationWarning[] = [];

  // Traccia ore assegnate per ogni collaboratore durante la generazione
  const oreAssegnateRuntime = new Map<string, number>();

  // Inizializza con ore già assegnate
  for (const coll of context.collaboratori) {
    oreAssegnateRuntime.set(coll.id, coll.ore_gia_assegnate);
  }

  // Genera le date della settimana
  const datesInWeek = getWeekDates(context.week_start, context.week_end);

  // Per ogni giorno della settimana
  for (const dateStr of datesInWeek) {
    const dayOfWeek = getDayOfWeek(dateStr); // 1-7

    // Per ogni nucleo
    for (const nucleo of context.nuclei) {
      // Calcola staff richiesto considerando criticità
      const staffRichiesto = calculateRequiredStaff(
        nucleo,
        dayOfWeek,
        dateStr,
        context.criticita_continuative,
        context.periodi_critici
      );

      // Determina orario del turno
      const orario = getShiftSchedule(nucleo, dayOfWeek, context.pattern_storici);

      // Calcola disponibilità di ogni collaboratore per questo giorno/nucleo
      const disponibilita = calculateAvailability(
        nucleo.id,
        dateStr,
        dayOfWeek,
        orario.durata,
        context,
        oreAssegnateRuntime
      );

      // Ordina collaboratori per priorità
      const collaboratoriOrdinati = sortCollaboratoriByPriority(
        disponibilita,
        nucleo.id,
        context
      );

      // Seleziona collaboratori suggeriti
      const collaboratoriSuggeriti = selectCollaboratori(
        collaboratoriOrdinati,
        staffRichiesto,
        nucleo.id
      );

      // Calcola copertura
      const disponibiliCount = collaboratoriSuggeriti.filter(c => c.disponibile).length;
      let coperturaStatus: 'ok' | 'parziale' | 'scoperta';
      if (disponibiliCount >= staffRichiesto) {
        coperturaStatus = 'ok';
      } else if (disponibiliCount > 0) {
        coperturaStatus = 'parziale';
      } else {
        coperturaStatus = 'scoperta';
      }

      // Genera warning se copertura insufficiente
      if (coperturaStatus !== 'ok') {
        warnings.push({
          tipo: 'copertura_insufficiente',
          messaggio: `${nucleo.nome} ${GIORNI_SETTIMANA[dayOfWeek]} ${dateStr}: ${disponibiliCount}/${staffRichiesto} collaboratori disponibili`,
          data: dateStr,
          nucleo_id: nucleo.id,
          severita: coperturaStatus === 'scoperta' ? 'error' : 'warning',
        });
      }

      // Aggiorna ore assegnate per i collaboratori suggeriti disponibili
      for (const coll of collaboratoriSuggeriti.filter(c => c.disponibile).slice(0, staffRichiesto)) {
        const currentOre = oreAssegnateRuntime.get(coll.id) || 0;
        oreAssegnateRuntime.set(coll.id, currentOre + orario.durata);
      }

      // Crea turno generato
      const turno: GeneratedShift = {
        nucleo_id: nucleo.id,
        nucleo_nome: nucleo.nome,
        nucleo_colore: nucleo.colore,
        data: dateStr,
        ora_inizio: orario.inizio,
        ora_fine: orario.fine,
        num_collaboratori_richiesti: staffRichiesto,
        collaboratori_suggeriti: collaboratoriSuggeriti,
        copertura_status: coperturaStatus,
        confidence: calculateConfidence(coperturaStatus, collaboratoriSuggeriti),
        reasoning: generateReasoning(nucleo, dayOfWeek, staffRichiesto, context),
      };

      // Aggiungi warning per spostamenti suggeriti
      const spostamenti = collaboratoriSuggeriti.filter(c => c.spostabile_da);
      if (spostamenti.length > 0) {
        turno.warning = `Spostamenti suggeriti: ${spostamenti.map(c => `${c.nome} da ${c.spostabile_da}`).join(', ')}`;
      }

      turni.push(turno);
    }
  }

  // Calcola statistiche
  const coverageStats = calculateCoverageStats(turni);
  const workloadDistribution = calculateWorkloadDistribution(context.collaboratori, oreAssegnateRuntime);

  // Warning per superamento ore
  for (const coll of context.collaboratori) {
    const oreAssegnate = oreAssegnateRuntime.get(coll.id) || 0;
    if (oreAssegnate > coll.ore_settimanali) {
      warnings.push({
        tipo: 'superamento_ore',
        messaggio: `${coll.nome} ${coll.cognome}: ${oreAssegnate.toFixed(1)}h assegnate su ${coll.ore_settimanali}h contratto`,
        collaboratore_id: coll.id,
        severita: 'warning',
      });
    }
  }

  const confidenceAverage = turni.length > 0
    ? turni.reduce((sum, t) => sum + t.confidence, 0) / turni.length
    : 0;

  return {
    turni,
    coverage_stats: coverageStats,
    workload_distribution: workloadDistribution,
    warnings,
    confidence_average: confidenceAverage,
  };
}

/**
 * Calcola staff richiesto considerando criticità
 */
function calculateRequiredStaff(
  nucleo: GenerationContext['nuclei'][0],
  dayOfWeek: number,
  dateStr: string,
  criticitaContinuative: GenerationContext['criticita_continuative'],
  periodiCritici: GenerationContext['periodi_critici']
): number {
  let staff = nucleo.membri_richiesti_min;

  // Applica criticità continuative per questo giorno
  const criticitaGiorno = criticitaContinuative.filter(c => c.giorno_settimana === dayOfWeek);
  for (const crit of criticitaGiorno) {
    staff += crit.staff_extra;
    staff = Math.ceil(staff * crit.moltiplicatore_staff);
  }

  // Applica periodi critici sporadici
  const periodiAttivi = periodiCritici.filter(p => {
    const dataInizio = new Date(p.data_inizio);
    const dataFine = new Date(p.data_fine);
    const dataCorrente = new Date(dateStr);
    return dataCorrente >= dataInizio && dataCorrente <= dataFine;
  });

  for (const periodo of periodiAttivi) {
    if (periodo.staff_minimo && periodo.staff_minimo > staff) {
      staff = periodo.staff_minimo;
    }
    staff = Math.ceil(staff * periodo.moltiplicatore_staff);
  }

  // Rispetta massimo se definito
  if (nucleo.membri_richiesti_max && staff > nucleo.membri_richiesti_max) {
    staff = nucleo.membri_richiesti_max;
  }

  return Math.max(1, staff);
}

/**
 * Determina orario del turno basandosi su pattern storici o default
 */
function getShiftSchedule(
  nucleo: GenerationContext['nuclei'][0],
  dayOfWeek: number,
  patternStorici: GenerationContext['pattern_storici']
): { inizio: string; fine: string; durata: number } {
  // Prima controlla orario specifico del nucleo
  if (nucleo.orario_specifico) {
    const giornoNome = GIORNI_SETTIMANA[dayOfWeek].toLowerCase();
    const orario = nucleo.orario_specifico[giornoNome];
    if (orario) {
      return {
        inizio: orario.inizio,
        fine: orario.fine,
        durata: calculateDuration(orario.inizio, orario.fine),
      };
    }
  }

  // Cerca pattern storico per questo nucleo/giorno
  const pattern = patternStorici.find(
    p => p.nucleo_id === nucleo.id && p.giorno_settimana === dayOfWeek
  );
  if (pattern?.orario_tipico) {
    return {
      inizio: pattern.orario_tipico.inizio,
      fine: pattern.orario_tipico.fine,
      durata: calculateDuration(pattern.orario_tipico.inizio, pattern.orario_tipico.fine),
    };
  }

  // Default: 09:00-18:00 (8 ore)
  return { inizio: '09:00', fine: '18:00', durata: 8 };
}

/**
 * Calcola disponibilità di ogni collaboratore per un giorno/nucleo
 */
function calculateAvailability(
  nucleoId: string,
  dateStr: string,
  dayOfWeek: number,
  durataTurno: number,
  context: GenerationContext,
  oreAssegnateRuntime: Map<string, number>
): DisponibilitaGiorno[] {
  const result: DisponibilitaGiorno[] = [];

  // Trova tutti i collaboratori che appartengono a questo nucleo
  const collaboratoriNucleo = context.collaboratori.filter(c =>
    c.nuclei_appartenenza.includes(nucleoId)
  );

  for (const coll of collaboratoriNucleo) {
    const disponibilita: DisponibilitaGiorno = {
      collaboratore_id: coll.id,
      nome_completo: `${coll.nome} ${coll.cognome}`,
      disponibile: true,
      ore_residue: coll.ore_settimanali - (oreAssegnateRuntime.get(coll.id) || 0),
      nuclei_appartenenza: coll.nuclei_appartenenza,
    };

    // Check 1: Riposo assegnato
    const riposo = context.riposi.find(
      r => r.collaboratore_id === coll.id && r.giorno_settimana === dayOfWeek
    );
    if (riposo) {
      disponibilita.disponibile = false;
      disponibilita.motivo_non_disponibile = `Riposo ${riposo.tipo_riposo}`;
      result.push(disponibilita);
      continue;
    }

    // Check 2: Ferie/permessi approvati
    const richiesta = context.richieste_approvate.find(r => {
      if (r.collaboratore_id !== coll.id) return false;
      const dataInizio = new Date(r.data_inizio);
      const dataFine = new Date(r.data_fine);
      const dataCorrente = new Date(dateStr);
      return dataCorrente >= dataInizio && dataCorrente <= dataFine;
    });
    if (richiesta) {
      disponibilita.disponibile = false;
      disponibilita.motivo_non_disponibile = `${richiesta.tipo.charAt(0).toUpperCase() + richiesta.tipo.slice(1)} approvato`;
      result.push(disponibilita);
      continue;
    }

    // Check 3: Ore residue insufficienti
    if (disponibilita.ore_residue < durataTurno) {
      disponibilita.disponibile = false;
      disponibilita.motivo_non_disponibile = `Ore insufficienti (${disponibilita.ore_residue.toFixed(1)}h residue)`;
      result.push(disponibilita);
      continue;
    }

    // Check 4: Preferenza UNAVAILABLE
    const preferenza = context.preferenze.find(
      p => p.collaboratore_id === coll.id && p.data === dateStr
    );
    if (preferenza) {
      disponibilita.preferenza = preferenza.tipo;
      if (preferenza.tipo === 'UNAVAILABLE') {
        disponibilita.disponibile = false;
        disponibilita.motivo_non_disponibile = 'Non disponibile (preferenza)';
        result.push(disponibilita);
        continue;
      }
    }

    result.push(disponibilita);
  }

  return result;
}

/**
 * Ordina collaboratori per priorità di assegnazione
 */
function sortCollaboratoriByPriority(
  disponibilita: DisponibilitaGiorno[],
  nucleoId: string,
  context: GenerationContext
): DisponibilitaGiorno[] {
  return [...disponibilita].sort((a, b) => {
    // 1. Disponibili prima dei non disponibili
    if (a.disponibile !== b.disponibile) {
      return a.disponibile ? -1 : 1;
    }

    // 2. Preferenza PREFERRED ha priorità
    if (a.preferenza === 'PREFERRED' && b.preferenza !== 'PREFERRED') return -1;
    if (b.preferenza === 'PREFERRED' && a.preferenza !== 'PREFERRED') return 1;

    // 3. Chi ha più ore residue ha priorità (distribuisce meglio il carico)
    if (a.ore_residue !== b.ore_residue) {
      return b.ore_residue - a.ore_residue;
    }

    // 4. Chi ha il nucleo come primario ha priorità
    const collA = context.collaboratori.find(c => c.id === a.collaboratore_id);
    const collB = context.collaboratori.find(c => c.id === b.collaboratore_id);
    const aPrimario = collA?.nucleo_primario === nucleoId;
    const bPrimario = collB?.nucleo_primario === nucleoId;
    if (aPrimario !== bPrimario) {
      return aPrimario ? -1 : 1;
    }

    return 0;
  });
}

/**
 * Seleziona collaboratori da suggerire per il turno
 */
function selectCollaboratori(
  collaboratoriOrdinati: DisponibilitaGiorno[],
  staffRichiesto: number,
  nucleoId: string
): CollaboratoreSuggerito[] {
  const result: CollaboratoreSuggerito[] = [];

  for (const disp of collaboratoriOrdinati) {
    const suggerito: CollaboratoreSuggerito = {
      id: disp.collaboratore_id,
      nome: disp.nome_completo,
      disponibile: disp.disponibile,
      ore_residue: disp.ore_residue,
      nuclei_appartenenza: disp.nuclei_appartenenza,
      motivo_non_disponibile: disp.motivo_non_disponibile,
      preferenza: disp.preferenza,
      spostabile_da: disp.spostabile_da,
    };

    // Calcola punteggio
    let punteggio = 0;
    if (disp.disponibile) punteggio += 100;
    if (disp.preferenza === 'PREFERRED') punteggio += 50;
    punteggio += Math.min(disp.ore_residue, 40); // Max 40 punti per ore residue
    suggerito.punteggio = punteggio;

    result.push(suggerito);
  }

  return result;
}

/**
 * Calcola confidence del turno
 */
function calculateConfidence(
  coperturaStatus: 'ok' | 'parziale' | 'scoperta',
  collaboratori: CollaboratoreSuggerito[]
): number {
  let base = coperturaStatus === 'ok' ? 0.9 : coperturaStatus === 'parziale' ? 0.6 : 0.3;

  // Boost se ci sono preferenze PREFERRED
  const preferred = collaboratori.filter(c => c.preferenza === 'PREFERRED' && c.disponibile);
  if (preferred.length > 0) {
    base += 0.05;
  }

  // Penalità se ci sono spostamenti
  const spostamenti = collaboratori.filter(c => c.spostabile_da);
  if (spostamenti.length > 0) {
    base -= 0.05;
  }

  return Math.min(0.99, Math.max(0.1, base));
}

/**
 * Genera reasoning per il turno
 */
function generateReasoning(
  nucleo: GenerationContext['nuclei'][0],
  dayOfWeek: number,
  staffRichiesto: number,
  context: GenerationContext
): string {
  const parts: string[] = [];

  parts.push(`${nucleo.nome} ${GIORNI_SETTIMANA[dayOfWeek]}: ${staffRichiesto} collaboratori richiesti`);

  // Menziona criticità attive
  const criticitaGiorno = context.criticita_continuative.filter(c => c.giorno_settimana === dayOfWeek);
  if (criticitaGiorno.length > 0) {
    parts.push(`Criticità: ${criticitaGiorno.map(c => c.nome).join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Calcola statistiche copertura
 */
function calculateCoverageStats(turni: GeneratedShift[]): CoverageStats {
  const totale = turni.length;
  const coperti = turni.filter(t => t.copertura_status === 'ok').length;
  const parziali = turni.filter(t => t.copertura_status === 'parziale').length;
  const scoperti = turni.filter(t => t.copertura_status === 'scoperta').length;

  return {
    totale_turni: totale,
    turni_coperti: coperti,
    turni_parziali: parziali,
    turni_scoperti: scoperti,
    percentuale_copertura: totale > 0 ? (coperti / totale) * 100 : 0,
  };
}

/**
 * Calcola distribuzione carichi di lavoro
 */
function calculateWorkloadDistribution(
  collaboratori: GenerationContext['collaboratori'],
  oreAssegnate: Map<string, number>
): WorkloadDistribution {
  const perCollaboratore = collaboratori.map(c => {
    const ore = oreAssegnate.get(c.id) || 0;
    return {
      id: c.id,
      nome: `${c.nome} ${c.cognome}`,
      ore_assegnate: ore,
      ore_contratto: c.ore_settimanali,
      percentuale_utilizzo: c.ore_settimanali > 0 ? (ore / c.ore_settimanali) * 100 : 0,
    };
  });

  // Calcola score equità (deviazione standard normalizzata delle percentuali)
  const percentuali = perCollaboratore.map(c => c.percentuale_utilizzo);
  const media = percentuali.reduce((a, b) => a + b, 0) / percentuali.length || 0;
  const varianza = percentuali.reduce((sum, p) => sum + Math.pow(p - media, 2), 0) / percentuali.length || 0;
  const devStd = Math.sqrt(varianza);

  // Score equità: 1 = perfetta equità, 0 = massima disuguaglianza
  const equitaScore = Math.max(0, 1 - (devStd / 100));

  return {
    per_collaboratore: perCollaboratore,
    equita_score: equitaScore,
  };
}

// Utility functions

function getWeekDates(weekStart: string, weekEnd: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0=Dom, 1=Lun, ...
  return day === 0 ? 7 : day; // Converti a 1-7 (Lun-Dom)
}

function calculateDuration(inizio: string, fine: string): number {
  const [hI, mI] = inizio.split(':').map(Number);
  const [hF, mF] = fine.split(':').map(Number);
  return (hF * 60 + mF - (hI * 60 + mI)) / 60;
}
