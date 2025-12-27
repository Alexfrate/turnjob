/**
 * Algoritmo di assegnazione automatica riposi settimanali
 *
 * Assegna riposi ottimali rispettando:
 * - Configurazione collaboratore (giorni interi, mezze giornate, ore)
 * - Criticità continuative (evita giorni critici)
 * - Copertura minima nuclei (evita scoperte)
 * - Distribuzione equa nel team
 */

import type {
  CollaboratoreDisponibilita,
  NucleoInfo,
  CriticitaContinuativa,
  RiposoAssegnato,
  RichiestaApprovata,
} from './types';
import type { TipoRiposo } from '@/types/database';

// Giorni della settimana (1=Lunedì, 7=Domenica)
const GIORNI_SETTIMANA = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

// Input per l'assegnazione riposi
export interface RiposiAssignmentInput {
  collaboratore_id: string;
  nome_completo: string;
  tipo_riposo: TipoRiposo;
  quantita: number; // numero di giorni, mezze giornate, o ore
  settimana_inizio: string; // YYYY-MM-DD (lunedì della settimana)
}

// Contesto per l'assegnazione
export interface RiposiAssignmentContext {
  collaboratori: CollaboratoreDisponibilita[];
  nuclei: NucleoInfo[];
  criticita_continuative: CriticitaContinuativa[];
  richieste_approvate: RichiestaApprovata[];
  riposi_gia_assegnati: RiposoAssegnato[];
  slot_occupati: Map<number, string[]>; // giorno (1-7) → array di collaboratore_id con turno
}

// Risultato assegnazione riposi
export interface RiposiAssignmentResult {
  riposi: RiposoGenerato[];
  warnings: string[];
  success: boolean;
  reasoning: string;
}

// Riposo generato dall'algoritmo
export interface RiposoGenerato {
  collaboratore_id: string;
  nome_completo: string;
  giorno_settimana: number; // 1-7
  giorno_nome: string; // "Lunedì", "Martedì", etc.
  tipo_riposo: 'intero' | 'mezza_mattina' | 'mezza_pomeriggio';
  data: string; // YYYY-MM-DD
  confidence: number;
}

/**
 * Assegna riposi automaticamente per un collaboratore
 */
export function assignRiposiAutomatici(
  input: RiposiAssignmentInput,
  context: RiposiAssignmentContext
): RiposiAssignmentResult {
  const { collaboratore_id, nome_completo, tipo_riposo, quantita, settimana_inizio } = input;
  const riposi: RiposoGenerato[] = [];
  const warnings: string[] = [];

  // Calcola date della settimana
  const weekDates = getWeekDates(settimana_inizio);

  // Trova i nuclei a cui appartiene il collaboratore
  const nucleiCollaboratore = context.nuclei.filter(n => n.membri.includes(collaboratore_id));

  // Calcola score per ogni giorno (1-7)
  const giorniScores = calculateDayScores(
    collaboratore_id,
    nucleiCollaboratore,
    context,
    weekDates
  );

  // Ordina i giorni per score (migliori prima)
  const giorniOrdinati = [...giorniScores].sort((a, b) => b.score - a.score);

  // Assegna riposi in base al tipo
  switch (tipo_riposo) {
    case 'giorni_interi': {
      // Assegna N giorni interi
      const giorniDaAssegnare = Math.min(quantita, 7);
      let assegnati = 0;

      for (const giorno of giorniOrdinati) {
        if (assegnati >= giorniDaAssegnare) break;

        // Verifica che non ci siano già riposi per questo giorno
        const giaAssegnato = context.riposi_gia_assegnati.some(
          r => r.collaboratore_id === collaboratore_id && r.giorno_settimana === giorno.numero
        );
        if (giaAssegnato) {
          warnings.push(`${GIORNI_SETTIMANA[giorno.numero]}: già assegnato un riposo`);
          continue;
        }

        // Verifica copertura minima
        if (giorno.causerebbeScopertura) {
          warnings.push(`${GIORNI_SETTIMANA[giorno.numero]}: evitato per copertura minima`);
          continue;
        }

        riposi.push({
          collaboratore_id,
          nome_completo,
          giorno_settimana: giorno.numero,
          giorno_nome: GIORNI_SETTIMANA[giorno.numero],
          tipo_riposo: 'intero',
          data: weekDates[giorno.numero - 1],
          confidence: giorno.score / 100,
        });
        assegnati++;
      }

      if (assegnati < giorniDaAssegnare) {
        warnings.push(`Assegnati solo ${assegnati}/${giorniDaAssegnare} giorni di riposo`);
      }
      break;
    }

    case 'mezze_giornate': {
      // Assegna N mezze giornate
      const mezzeGiornateDaAssegnare = Math.min(quantita, 14); // max 2 per giorno
      let assegnate = 0;

      for (const giorno of giorniOrdinati) {
        if (assegnate >= mezzeGiornateDaAssegnare) break;

        // Verifica riposi esistenti
        const riposoEsistente = context.riposi_gia_assegnati.find(
          r => r.collaboratore_id === collaboratore_id && r.giorno_settimana === giorno.numero
        );

        if (riposoEsistente?.tipo_riposo === 'intero') {
          continue; // Giorno già completamente occupato
        }

        // Assegna mattina o pomeriggio in base a cosa è libero
        const tipoMezza: 'mezza_mattina' | 'mezza_pomeriggio' =
          riposoEsistente?.tipo_riposo === 'mezza_mattina' ? 'mezza_pomeriggio' : 'mezza_mattina';

        riposi.push({
          collaboratore_id,
          nome_completo,
          giorno_settimana: giorno.numero,
          giorno_nome: GIORNI_SETTIMANA[giorno.numero],
          tipo_riposo: tipoMezza,
          data: weekDates[giorno.numero - 1],
          confidence: giorno.score / 100,
        });
        assegnate++;
      }

      if (assegnate < mezzeGiornateDaAssegnare) {
        warnings.push(`Assegnate solo ${assegnate}/${mezzeGiornateDaAssegnare} mezze giornate di riposo`);
      }
      break;
    }

    case 'ore': {
      // Converti ore in giorni/mezze giornate
      // Assumiamo: 8 ore = 1 giorno, 4 ore = mezza giornata
      const oreRichieste = quantita;
      const giorniInteri = Math.floor(oreRichieste / 8);
      const oreResidue = oreRichieste % 8;
      const mezzeGiornate = Math.floor(oreResidue / 4);

      let slotAssegnati = 0;
      const slotTotali = giorniInteri + mezzeGiornate;

      // Prima assegna giorni interi
      for (let i = 0; i < giorniInteri && slotAssegnati < giorniOrdinati.length; i++) {
        const giorno = giorniOrdinati[slotAssegnati];

        if (!giorno.causerebbeScopertura) {
          riposi.push({
            collaboratore_id,
            nome_completo,
            giorno_settimana: giorno.numero,
            giorno_nome: GIORNI_SETTIMANA[giorno.numero],
            tipo_riposo: 'intero',
            data: weekDates[giorno.numero - 1],
            confidence: giorno.score / 100,
          });
        }
        slotAssegnati++;
      }

      // Poi assegna mezze giornate
      for (let i = 0; i < mezzeGiornate && slotAssegnati < giorniOrdinati.length; i++) {
        const giorno = giorniOrdinati[slotAssegnati];

        if (!giorno.causerebbeScopertura) {
          riposi.push({
            collaboratore_id,
            nome_completo,
            giorno_settimana: giorno.numero,
            giorno_nome: GIORNI_SETTIMANA[giorno.numero],
            tipo_riposo: 'mezza_mattina',
            data: weekDates[giorno.numero - 1],
            confidence: giorno.score / 100,
          });
        }
        slotAssegnati++;
      }

      if (riposi.length < slotTotali) {
        warnings.push(`Assegnate solo ${riposi.length * 8}/${oreRichieste} ore di riposo`);
      }
      break;
    }
  }

  // Genera reasoning
  const reasoning = generateReasoning(riposi, warnings, tipo_riposo, quantita, nome_completo);

  return {
    riposi,
    warnings,
    success: riposi.length > 0,
    reasoning,
  };
}

/**
 * Calcola score per ogni giorno della settimana
 */
function calculateDayScores(
  collaboratoreId: string,
  nucleiCollaboratore: NucleoInfo[],
  context: RiposiAssignmentContext,
  weekDates: string[]
): { numero: number; score: number; causerebbeScopertura: boolean }[] {
  const scores: { numero: number; score: number; causerebbeScopertura: boolean }[] = [];

  for (let giorno = 1; giorno <= 7; giorno++) {
    let score = 100; // Score base
    let causerebbeScopertura = false;

    // Penalità per criticità continuative
    const criticitaGiorno = context.criticita_continuative.filter(c => c.giorno_settimana === giorno);
    for (const crit of criticitaGiorno) {
      // Penalità proporzionale allo staff extra richiesto
      score -= crit.staff_extra * 15;
      score -= (crit.moltiplicatore_staff - 1) * 20;
    }

    // Penalità se ci sono richieste ferie/permessi approvate per altri collaboratori (carico maggiore)
    const dataGiorno = weekDates[giorno - 1];
    const richiesteGiorno = context.richieste_approvate.filter(r => {
      const dataInizio = new Date(r.data_inizio);
      const dataFine = new Date(r.data_fine);
      const dataCorrente = new Date(dataGiorno);
      return dataCorrente >= dataInizio && dataCorrente <= dataFine && r.collaboratore_id !== collaboratoreId;
    });
    score -= richiesteGiorno.length * 10;

    // Verifica copertura per ogni nucleo
    for (const nucleo of nucleiCollaboratore) {
      const membriTotali = nucleo.membri.length;
      const membriInRiposo = context.riposi_gia_assegnati.filter(
        r => nucleo.membri.includes(r.collaboratore_id) && r.giorno_settimana === giorno
      ).length;
      const membriInFerie = context.richieste_approvate.filter(r => {
        const dataInizio = new Date(r.data_inizio);
        const dataFine = new Date(r.data_fine);
        const dataCorrente = new Date(dataGiorno);
        return nucleo.membri.includes(r.collaboratore_id) &&
               dataCorrente >= dataInizio && dataCorrente <= dataFine;
      }).length;

      const membriDisponibili = membriTotali - membriInRiposo - membriInFerie;
      const membriSeAssegno = membriDisponibili - 1; // -1 perché sto assegnando riposo al collaboratore corrente

      // Se assegnando il riposo scendiamo sotto il minimo, penalizza fortemente
      if (membriSeAssegno < nucleo.membri_richiesti_min) {
        causerebbeScopertura = true;
        score -= 50;
      }
    }

    // Bonus per distribuire i riposi uniformemente nel team
    const riposiGiornoCount = context.riposi_gia_assegnati.filter(r => r.giorno_settimana === giorno).length;
    const mediaRiposiPerGiorno = context.riposi_gia_assegnati.length / 7;
    if (riposiGiornoCount < mediaRiposiPerGiorno) {
      score += 10; // Bonus per giorni con meno riposi
    }

    // Weekend bonus (spesso preferiti per riposi)
    if (giorno >= 6) {
      score += 5;
    }

    scores.push({
      numero: giorno,
      score: Math.max(0, score),
      causerebbeScopertura,
    });
  }

  return scores;
}

/**
 * Genera date della settimana
 */
function getWeekDates(weekStart: string): string[] {
  if (!weekStart) {
    throw new Error('weekStart è richiesto per generare le date della settimana');
  }

  const dates: string[] = [];
  const start = new Date(weekStart);

  if (isNaN(start.getTime())) {
    throw new Error(`Formato data non valido: ${weekStart}`);
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Genera reasoning per l'assegnazione
 */
function generateReasoning(
  riposi: RiposoGenerato[],
  warnings: string[],
  tipoRiposo: TipoRiposo,
  quantita: number,
  nomeCompleto: string
): string {
  const parts: string[] = [];

  if (riposi.length === 0) {
    return `Non è stato possibile assegnare riposi a ${nomeCompleto}. ${warnings.join('. ')}`;
  }

  // Descrizione generale
  const tipoDescr = tipoRiposo === 'giorni_interi'
    ? 'giorni di riposo'
    : tipoRiposo === 'mezze_giornate'
      ? 'mezze giornate di riposo'
      : 'ore di riposo';

  parts.push(`Ho assegnato ${riposi.length} ${tipoDescr} a ${nomeCompleto}`);

  // Lista giorni
  const giorniAssegnati = riposi.map(r => {
    const tipoStr = r.tipo_riposo === 'intero'
      ? ''
      : r.tipo_riposo === 'mezza_mattina'
        ? ' (mattina)'
        : ' (pomeriggio)';
    return `${r.giorno_nome}${tipoStr}`;
  }).join(', ');

  parts.push(`: ${giorniAssegnati}`);

  // Warnings se presenti
  if (warnings.length > 0) {
    parts.push(`. Note: ${warnings.join('. ')}`);
  }

  // Reasoning per scelte
  const giorniEvitati = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    .filter(g => !riposi.some(r => r.giorno_nome === g));

  if (giorniEvitati.length > 0 && giorniEvitati.length < 5) {
    parts.push(`. Ho evitato ${giorniEvitati.join(', ')} per garantire copertura adeguata`);
  }

  return parts.join('');
}

/**
 * Assegna riposi per più collaboratori contemporaneamente
 */
export function assignRiposiMultipli(
  inputs: RiposiAssignmentInput[],
  context: RiposiAssignmentContext
): RiposiAssignmentResult[] {
  const results: RiposiAssignmentResult[] = [];

  // Crea una copia del context per aggiornare i riposi già assegnati progressivamente
  const workingContext = { ...context };

  for (const input of inputs) {
    const result = assignRiposiAutomatici(input, workingContext);
    results.push(result);

    // Aggiungi i riposi assegnati al context per le prossime iterazioni
    for (const riposo of result.riposi) {
      workingContext.riposi_gia_assegnati.push({
        collaboratore_id: riposo.collaboratore_id,
        giorno_settimana: riposo.giorno_settimana,
        tipo_riposo: riposo.tipo_riposo,
      });
    }
  }

  return results;
}
