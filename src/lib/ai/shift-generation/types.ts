/**
 * Tipi per il sistema di generazione turni AI
 */

// Dati collaboratore con info disponibilità
export interface CollaboratoreDisponibilita {
  id: string;
  nome: string;
  cognome: string;
  tipo_contratto: 'full_time' | 'part_time' | 'altro' | null;
  ore_settimanali: number;
  ore_gia_assegnate: number;
  ore_residue: number;
  nuclei_appartenenza: string[]; // IDs dei nuclei a cui appartiene
  nuclei_nomi: string[]; // Nomi dei nuclei
  nucleo_primario?: string; // ID nucleo dove lavora di più (da storico)
}

// Disponibilità collaboratore per un giorno specifico
export interface DisponibilitaGiorno {
  collaboratore_id: string;
  nome_completo: string;
  disponibile: boolean;
  ore_residue: number;
  nuclei_appartenenza: string[];
  motivo_non_disponibile?: string;
  preferenza?: 'PREFERRED' | 'AVAILABLE' | 'UNAVAILABLE';
  spostabile_da?: string; // Se suggerito come spostamento, da quale nucleo
}

// Turno generato dall'algoritmo
export interface GeneratedShift {
  nucleo_id: string;
  nucleo_nome: string;
  nucleo_colore?: string;
  data: string; // YYYY-MM-DD
  ora_inizio: string; // HH:MM
  ora_fine: string; // HH:MM
  num_collaboratori_richiesti: number;
  collaboratori_suggeriti: CollaboratoreSuggerito[];
  copertura_status: 'ok' | 'parziale' | 'scoperta';
  confidence: number; // 0-1
  reasoning: string;
  warning?: string;
}

// Collaboratore suggerito per un turno
export interface CollaboratoreSuggerito {
  id: string;
  nome: string;
  disponibile: boolean;
  ore_residue: number;
  nuclei_appartenenza: string[];
  nucleo_primario?: string;
  spostabile_da?: string;
  motivo_non_disponibile?: string;
  preferenza?: 'PREFERRED' | 'AVAILABLE' | 'UNAVAILABLE';
  punteggio?: number; // Score di priorità per ordinamento
}

// Contesto completo per generazione
export interface GenerationContext {
  azienda_id: string;
  week_start: string;
  week_end: string;
  collaboratori: CollaboratoreDisponibilita[];
  nuclei: NucleoInfo[];
  criticita_continuative: CriticitaContinuativa[];
  periodi_critici: PeriodoCritico[];
  riposi: RiposoAssegnato[];
  preferenze: PreferenzaCollaboratore[];
  richieste_approvate: RichiestaApprovata[];
  pattern_storici: PatternStorico[];
}

// Info nucleo
export interface NucleoInfo {
  id: string;
  nome: string;
  mansione: string;
  colore: string;
  membri_richiesti_min: number;
  membri_richiesti_max?: number;
  orario_specifico?: {
    [giorno: string]: { inizio: string; fine: string };
  };
  membri: string[]; // IDs collaboratori che appartengono a questo nucleo
}

// Criticità continuativa
export interface CriticitaContinuativa {
  id: string;
  tipo: string;
  nome: string;
  giorno_settimana: number; // 1-7 (Lun-Dom)
  ora_inizio?: string;
  ora_fine?: string;
  staff_extra: number;
  moltiplicatore_staff: number;
}

// Periodo critico sporadico
export interface PeriodoCritico {
  id: string;
  nome: string;
  data_inizio: string;
  data_fine: string;
  ora_inizio?: string;
  ora_fine?: string;
  staff_minimo?: number;
  moltiplicatore_staff: number;
}

// Riposo assegnato
export interface RiposoAssegnato {
  collaboratore_id: string;
  giorno_settimana: number; // 1-7
  tipo_riposo: 'intero' | 'mezza_mattina' | 'mezza_pomeriggio';
}

// Preferenza collaboratore
export interface PreferenzaCollaboratore {
  collaboratore_id: string;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  tipo: 'PREFERRED' | 'AVAILABLE' | 'UNAVAILABLE';
}

// Richiesta ferie/permessi approvata
export interface RichiestaApprovata {
  collaboratore_id: string;
  tipo: 'ferie' | 'permesso' | 'riposo';
  data_inizio: string;
  data_fine: string;
}

// Pattern storico per nucleo
export interface PatternStorico {
  nucleo_id: string;
  nucleo_nome: string;
  giorno_settimana: number;
  media_collaboratori: number;
  orario_tipico?: { inizio: string; fine: string };
}

// Risultato generazione settimana
export interface WeekGenerationResult {
  turni: GeneratedShift[];
  coverage_stats: CoverageStats;
  workload_distribution: WorkloadDistribution;
  warnings: GenerationWarning[];
  confidence_average: number;
}

// Statistiche copertura
export interface CoverageStats {
  totale_turni: number;
  turni_coperti: number;
  turni_parziali: number;
  turni_scoperti: number;
  percentuale_copertura: number;
}

// Distribuzione carichi di lavoro
export interface WorkloadDistribution {
  per_collaboratore: {
    id: string;
    nome: string;
    ore_assegnate: number;
    ore_contratto: number;
    percentuale_utilizzo: number;
  }[];
  equita_score: number; // 0-1, dove 1 = distribuzione perfettamente equa
}

// Warning generazione
export interface GenerationWarning {
  tipo: 'copertura_insufficiente' | 'superamento_ore' | 'spostamento_suggerito' | 'nessun_disponibile';
  messaggio: string;
  data?: string;
  nucleo_id?: string;
  collaboratore_id?: string;
  severita: 'info' | 'warning' | 'error';
}
