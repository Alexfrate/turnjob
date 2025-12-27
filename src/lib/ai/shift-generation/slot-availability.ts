/**
 * Logica di disponibilità slot
 *
 * Implementa la logica "Gaetano/Luigi":
 * - Se la copertura minima non è raggiunta, blocca le richieste di riposo/assenza
 * - Se sei l'unico disponibile, non puoi richiedere assenza
 */

import type { GenerationContext, CollaboratoreDisponibilita } from './types';

export interface SlotAvailabilityInput {
  nucleo_id: string;
  data: string; // YYYY-MM-DD
  collaboratore_id: string; // Chi sta facendo la richiesta
  tipo_richiesta: 'riposo' | 'ferie' | 'permesso' | 'preferenza_unavailable';
}

export interface SlotAvailabilityResult {
  disponibile: boolean;
  motivo?: string;
  dettagli?: {
    copertura_minima: number;
    copertura_attuale: number;
    copertura_se_approvato: number;
    altri_disponibili: string[]; // Nomi degli altri disponibili
  };
}

export interface CollaboratoreSlotInfo {
  id: string;
  nome: string;
  cognome: string;
  disponibile: boolean;
  ha_riposo: boolean;
  ha_ferie: boolean;
  ha_preferenza_unavailable: boolean;
}

/**
 * Verifica se un collaboratore può richiedere riposo/assenza per un dato slot
 *
 * Logica:
 * 1. Conta la copertura minima richiesta per il nucleo
 * 2. Conta quanti collaboratori sono GIA assegnati o NON disponibili
 * 3. Se approvando questa richiesta scendiamo sotto la copertura minima
 *    E non ci sono altri collaboratori disponibili a coprire, BLOCCA
 */
export function checkSlotAvailability(
  input: SlotAvailabilityInput,
  context: GenerationContext
): SlotAvailabilityResult {
  const { nucleo_id, data, collaboratore_id, tipo_richiesta } = input;

  // Trova il nucleo
  const nucleo = context.nuclei.find(n => n.id === nucleo_id);
  if (!nucleo) {
    return { disponibile: true }; // Se nucleo non trovato, permetti (errore di configurazione)
  }

  const coperturaMinima = nucleo.membri_richiesti_min;

  // Trova tutti i collaboratori che appartengono a questo nucleo
  const collaboratoriNucleo = context.collaboratori.filter(c =>
    c.nuclei_appartenenza.includes(nucleo_id)
  );

  // Calcola il giorno della settimana (1-7)
  const dayOfWeek = getDayOfWeek(data);

  // Calcola chi è già non disponibile
  const statusCollaboratori = collaboratoriNucleo.map(coll => {
    const info: CollaboratoreSlotInfo = {
      id: coll.id,
      nome: coll.nome,
      cognome: coll.cognome,
      disponibile: true,
      ha_riposo: false,
      ha_ferie: false,
      ha_preferenza_unavailable: false,
    };

    // Check riposo assegnato
    const riposo = context.riposi.find(
      r => r.collaboratore_id === coll.id && r.giorno_settimana === dayOfWeek
    );
    if (riposo) {
      info.disponibile = false;
      info.ha_riposo = true;
    }

    // Check ferie/permessi
    const richiesta = context.richieste_approvate.find(r => {
      if (r.collaboratore_id !== coll.id) return false;
      const dataInizio = new Date(r.data_inizio);
      const dataFine = new Date(r.data_fine);
      const dataCorrente = new Date(data);
      return dataCorrente >= dataInizio && dataCorrente <= dataFine;
    });
    if (richiesta) {
      info.disponibile = false;
      info.ha_ferie = true;
    }

    // Check preferenza UNAVAILABLE
    const preferenza = context.preferenze.find(
      p => p.collaboratore_id === coll.id && p.data === data && p.tipo === 'UNAVAILABLE'
    );
    if (preferenza) {
      info.disponibile = false;
      info.ha_preferenza_unavailable = true;
    }

    return info;
  });

  // Copertura attuale: collaboratori disponibili
  const disponibiliAttuali = statusCollaboratori.filter(c => c.disponibile);
  const coperturaAttuale = disponibiliAttuali.length;

  // Se il collaboratore richiedente non è già disponibile, permetti (non cambia nulla)
  const richiedenteStatus = statusCollaboratori.find(c => c.id === collaboratore_id);
  if (!richiedenteStatus?.disponibile) {
    return {
      disponibile: true,
      dettagli: {
        copertura_minima: coperturaMinima,
        copertura_attuale: coperturaAttuale,
        copertura_se_approvato: coperturaAttuale,
        altri_disponibili: disponibiliAttuali
          .filter(c => c.id !== collaboratore_id)
          .map(c => `${c.nome} ${c.cognome}`),
      },
    };
  }

  // Copertura se approviamo la richiesta
  const coperturaSe = coperturaAttuale - 1;

  // Altri disponibili (escluso il richiedente)
  const altriDisponibili = disponibiliAttuali.filter(c => c.id !== collaboratore_id);

  // LOGICA DECISIONALE:
  // Se la copertura andrebbe sotto il minimo E non ci sono altri a coprire, BLOCCA
  if (coperturaSe < coperturaMinima) {
    // Verifica se ci sono collaboratori multi-nucleo che potrebbero coprire
    const multiNucleoDisponibili = context.collaboratori.filter(c => {
      // Appartiene a questo nucleo ma non è già contato
      if (!c.nuclei_appartenenza.includes(nucleo_id)) return false;
      // Non è il richiedente
      if (c.id === collaboratore_id) return false;
      // È disponibile
      const status = statusCollaboratori.find(s => s.id === c.id);
      return status?.disponibile;
    });

    const mancanti = coperturaMinima - coperturaSe;

    if (altriDisponibili.length < mancanti) {
      return {
        disponibile: false,
        motivo: buildBlockMessage(
          tipo_richiesta,
          nucleo.nome,
          coperturaMinima,
          coperturaSe,
          altriDisponibili
        ),
        dettagli: {
          copertura_minima: coperturaMinima,
          copertura_attuale: coperturaAttuale,
          copertura_se_approvato: coperturaSe,
          altri_disponibili: altriDisponibili.map(c => `${c.nome} ${c.cognome}`),
        },
      };
    }
  }

  return {
    disponibile: true,
    dettagli: {
      copertura_minima: coperturaMinima,
      copertura_attuale: coperturaAttuale,
      copertura_se_approvato: coperturaSe,
      altri_disponibili: altriDisponibili.map(c => `${c.nome} ${c.cognome}`),
    },
  };
}

/**
 * Costruisce messaggio di blocco user-friendly
 */
function buildBlockMessage(
  tipoRichiesta: string,
  nucleoNome: string,
  coperturaMinima: number,
  coperturaSe: number,
  altriDisponibili: CollaboratoreSlotInfo[]
): string {
  const tipoLabel = {
    riposo: 'il riposo',
    ferie: 'le ferie',
    permesso: 'il permesso',
    preferenza_unavailable: 'la non disponibilità',
  }[tipoRichiesta] || 'la richiesta';

  if (altriDisponibili.length === 0) {
    return `Non puoi richiedere ${tipoLabel} per questo giorno: sei l'unico collaboratore disponibile per ${nucleoNome} e serve copertura minima di ${coperturaMinima} persona/e.`;
  }

  const mancanti = coperturaMinima - coperturaSe;
  return `Non puoi richiedere ${tipoLabel} per questo giorno: ${nucleoNome} richiede almeno ${coperturaMinima} collaboratori, ma approvando resterebbe solo ${coperturaSe}. Servono ancora ${mancanti} persona/e di copertura.`;
}

/**
 * Verifica disponibilità per più slot contemporaneamente
 * Utile per richieste ferie multi-giorno
 */
export function checkMultiSlotAvailability(
  collaboratore_id: string,
  nucleo_id: string,
  date: string[], // Array di date YYYY-MM-DD
  tipo_richiesta: 'riposo' | 'ferie' | 'permesso' | 'preferenza_unavailable',
  context: GenerationContext
): { tutti_disponibili: boolean; risultati: Record<string, SlotAvailabilityResult> } {
  const risultati: Record<string, SlotAvailabilityResult> = {};
  let tuttiDisponibili = true;

  for (const data of date) {
    const result = checkSlotAvailability(
      { nucleo_id, data, collaboratore_id, tipo_richiesta },
      context
    );
    risultati[data] = result;
    if (!result.disponibile) {
      tuttiDisponibili = false;
    }
  }

  return { tutti_disponibili: tuttiDisponibili, risultati };
}

/**
 * Suggerisce spostamenti per liberare uno slot
 * Se il collaboratore vuole un giorno libero ma non può, suggerisce chi potrebbe coprire
 */
export function suggestCoverageOptions(
  nucleo_id: string,
  data: string,
  collaboratore_id: string,
  context: GenerationContext
): {
  possibile_coprire: boolean;
  collaboratori_che_potrebbero_coprire: {
    id: string;
    nome: string;
    provenienza?: string; // Se viene da un altro nucleo
    ore_residue: number;
  }[];
} {
  const nucleo = context.nuclei.find(n => n.id === nucleo_id);
  if (!nucleo) {
    return { possibile_coprire: false, collaboratori_che_potrebbero_coprire: [] };
  }

  const dayOfWeek = getDayOfWeek(data);
  const collaboratoriPotenziali: {
    id: string;
    nome: string;
    provenienza?: string;
    ore_residue: number;
  }[] = [];

  // Cerca collaboratori che appartengono a più nuclei e potrebbero essere spostati
  for (const coll of context.collaboratori) {
    // Salta il richiedente
    if (coll.id === collaboratore_id) continue;

    // Deve appartenere a questo nucleo
    if (!coll.nuclei_appartenenza.includes(nucleo_id)) continue;

    // Check se è disponibile
    const haRiposo = context.riposi.some(
      r => r.collaboratore_id === coll.id && r.giorno_settimana === dayOfWeek
    );
    if (haRiposo) continue;

    const haFerie = context.richieste_approvate.some(r => {
      if (r.collaboratore_id !== coll.id) return false;
      const dataInizio = new Date(r.data_inizio);
      const dataFine = new Date(r.data_fine);
      const dataCorrente = new Date(data);
      return dataCorrente >= dataInizio && dataCorrente <= dataFine;
    });
    if (haFerie) continue;

    const haPreferenzaUnavailable = context.preferenze.some(
      p => p.collaboratore_id === coll.id && p.data === data && p.tipo === 'UNAVAILABLE'
    );
    if (haPreferenzaUnavailable) continue;

    // Ha ore residue sufficienti? (assumiamo turno di 8 ore)
    if (coll.ore_residue < 8) continue;

    // Determina se viene da un altro nucleo
    let provenienza: string | undefined;
    if (coll.nuclei_appartenenza.length > 1 && coll.nucleo_primario !== nucleo_id) {
      const nucleoPrimario = context.nuclei.find(n => n.id === coll.nucleo_primario);
      if (nucleoPrimario) {
        provenienza = nucleoPrimario.nome;
      }
    }

    collaboratoriPotenziali.push({
      id: coll.id,
      nome: `${coll.nome} ${coll.cognome}`,
      provenienza,
      ore_residue: coll.ore_residue,
    });
  }

  return {
    possibile_coprire: collaboratoriPotenziali.length > 0,
    collaboratori_che_potrebbero_coprire: collaboratoriPotenziali,
  };
}

// Utility
function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0=Dom, 1=Lun, ...
  return day === 0 ? 7 : day; // Converti a 1-7 (Lun-Dom)
}
