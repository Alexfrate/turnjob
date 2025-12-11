/**
 * Tipi per il sistema AI Scheduling
 */

// Enums che corrispondono al database
export type AIModeType = 'SUGGESTION' | 'SEMI_AUTOMATIC' | 'AUTONOMOUS' | 'DISABLED';
export type CriticalPeriodSource = 'AI_DETECTED' | 'MANUAL' | 'HYBRID';
export type PreferenceType = 'AVAILABLE' | 'PREFERRED' | 'UNAVAILABLE';
export type PreferenceValidationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED_CONFLICT'
  | 'REJECTED_CRITICAL'
  | 'REJECTED_CONSTRAINT';

// Configurazione AI Scheduling
export interface AISchedulingConfig {
  id: string;
  azienda_id: string;
  modalita_ai: AIModeType;
  soglia_confidenza: number;
  considera_preferenze: boolean;
  rispetta_vincoli_hard: boolean;
  notifica_conflitti: boolean;
  genera_report: boolean;
  max_ore_settimanali: number;
  min_ore_riposo: number;
}

// Periodo Critico
export interface PeriodoCritico {
  id: string;
  azienda_id: string;
  nome: string;
  descrizione?: string;
  data_inizio: string;
  data_fine: string;
  ora_inizio?: string;
  ora_fine?: string;
  ricorrente: boolean;
  pattern_ricorrenza?: string;
  fonte: CriticalPeriodSource;
  confidenza_ai?: number;
  staff_minimo?: number;
  moltiplicatore_staff: number;
  blocca_preferenze: boolean;
  attivo: boolean;
}

// Preferenza Turno
export interface PreferenzaTurno {
  id: string;
  collaboratore_id: string;
  turno_id?: string;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  tipo: PreferenceType;
  stato_validazione: PreferenceValidationStatus;
  motivo_rifiuto?: string;
  validata_il?: string;
  note?: string;
}

// Template Vincolo
export interface TemplateVincolo {
  id: string;
  azienda_id?: string;
  nome: string;
  descrizione?: string;
  categoria: string;
  tipo_vincolo: 'HARD' | 'SOFT';
  regola: VincoloRegola;
  priorita: number;
  attivo: boolean;
  predefinito: boolean;
}

// Regola vincolo (JSON structure)
export interface VincoloRegola {
  tipo: string;
  ore?: number;
  periodo?: string;
  riferimento_legge?: string;
  [key: string]: unknown;
}

// Collaboratore (riferimento)
export interface Collaboratore {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  nucleo_id: string;
  azienda_id: string;
  ore_settimanali_contratto?: number;
  attivo: boolean;
}

// Nucleo (riferimento)
export interface Nucleo {
  id: string;
  nome: string;
  azienda_id: string;
  colore?: string;
}

// Turno (riferimento)
export interface Turno {
  id: string;
  nucleo_id: string;
  nome: string;
  descrizione?: string;
  ora_inizio: string;
  ora_fine: string;
  giorni_settimana: number[];
  colore?: string;
  attivo: boolean;
}

// Assegnazione (riferimento)
export interface Assegnazione {
  id: string;
  turno_id: string;
  collaboratore_id: string;
  data: string;
  ora_inizio_override?: string;
  ora_fine_override?: string;
  stato: 'confermato' | 'proposto' | 'annullato';
  generato_da_ai: boolean;
  confidenza_ai?: number;
  note?: string;
}

// ==========================================
// TIPI PER VALIDAZIONE
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  status: PreferenceValidationStatus;
  reason?: string;
  details?: ValidationDetail[];
}

export interface ValidationDetail {
  type: 'conflict' | 'critical_period' | 'constraint';
  message: string;
  severity: 'error' | 'warning';
  relatedEntityId?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingAssignments: Assegnazione[];
  conflictingPreferences: PreferenzaTurno[];
}

export interface CriticalPeriodCheckResult {
  isInCriticalPeriod: boolean;
  period?: PeriodoCritico;
  isBlocked: boolean;
}

export interface ConstraintCheckResult {
  violations: ConstraintViolation[];
  hasHardViolation: boolean;
}

export interface ConstraintViolation {
  vincolo: TemplateVincolo;
  message: string;
  severity: 'HARD' | 'SOFT';
}

// ==========================================
// TIPI PER GENERAZIONE
// ==========================================

export interface GenerationRequest {
  azienda_id: string;
  data_inizio: string;
  data_fine: string;
  nucleo_ids?: string[]; // Se vuoto, tutti i nuclei
  options?: GenerationOptions;
}

export interface GenerationOptions {
  rispetta_preferenze: boolean;
  ottimizza_equita: boolean;
  considera_periodi_critici: boolean;
  min_confidenza: number;
}

export interface GenerationResult {
  success: boolean;
  turni_generati: GeneratedShift[];
  assegnazioni_proposte: ProposedAssignment[];
  warnings: GenerationWarning[];
  metriche: GenerationMetrics;
}

export interface GeneratedShift {
  nucleo_id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  staff_richiesto: number;
  confidenza: number;
  reasoning?: string;
}

export interface ProposedAssignment {
  turno_id?: string;
  collaboratore_id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  confidenza: number;
  reasoning?: string;
  alternatives?: AlternativeAssignment[];
}

export interface AlternativeAssignment {
  collaboratore_id: string;
  confidenza: number;
  reasoning?: string;
}

export interface GenerationWarning {
  type: 'understaffed' | 'constraint_soft_violation' | 'preference_ignored' | 'critical_period';
  message: string;
  data?: string;
  nucleo_id?: string;
}

export interface GenerationMetrics {
  tempo_esecuzione_ms: number;
  confidenza_media: number;
  vincoli_hard_rispettati: number;
  vincoli_soft_rispettati: number;
  preferenze_soddisfatte: number;
  preferenze_totali: number;
}

// ==========================================
// TIPI PER ANALISI
// ==========================================

export interface WorkloadAnalysis {
  collaboratore_id: string;
  periodo: { inizio: string; fine: string };
  ore_lavorate: number;
  ore_previste: number;
  turni_assegnati: number;
  weekend_lavorati: number;
  bilancio: 'sottocarico' | 'equilibrato' | 'sovraccarico';
}

export interface CriticalPeriodSuggestion {
  data_inizio: string;
  data_fine: string;
  ora_inizio?: string;
  ora_fine?: string;
  confidenza: number;
  reasoning: string;
  fonte_dati: string[];
}
