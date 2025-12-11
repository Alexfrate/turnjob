'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AISchedulingConfig,
  AIModeType,
  PeriodoCritico,
  CriticalPeriodSource,
  GenerationResult,
} from '@/lib/ai/scheduling/types';

// Types per API responses
export interface AIConfigResponse extends AISchedulingConfig {
  exists: boolean;
}

export interface UpdateAIConfigInput {
  modalita_ai?: AIModeType;
  soglia_confidenza?: number;
  considera_preferenze?: boolean;
  rispetta_vincoli_hard?: boolean;
  notifica_conflitti?: boolean;
  genera_report?: boolean;
  max_ore_settimanali?: number;
  min_ore_riposo?: number;
}

export interface CreatePeriodoCriticoInput {
  nome: string;
  descrizione?: string;
  data_inizio: string;
  data_fine: string;
  ora_inizio?: string;
  ora_fine?: string;
  ricorrente?: boolean;
  pattern_ricorrenza?: string;
  fonte?: CriticalPeriodSource;
  staff_minimo?: number;
  moltiplicatore_staff?: number;
  blocca_preferenze?: boolean;
}

export interface GeneraTurniInput {
  data_inizio: string;
  data_fine: string;
  nucleo_ids?: string[];
  options?: {
    rispetta_preferenze?: boolean;
    ottimizza_equita?: boolean;
    considera_periodi_critici?: boolean;
    min_confidenza?: number;
  };
}

export interface PeriodiCriticiFilters {
  attivo?: boolean;
  data_inizio?: string;
  data_fine?: string;
}

// ==========================================
// API Functions - Config AI
// ==========================================

async function fetchAIConfig(): Promise<AIConfigResponse> {
  const res = await fetch('/api/ai/config');

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nel recupero della configurazione AI');
  }

  const { data } = await res.json();
  return data;
}

async function updateAIConfig(input: UpdateAIConfigInput): Promise<AISchedulingConfig> {
  const res = await fetch('/api/ai/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nell\'aggiornamento della configurazione AI');
  }

  const { data } = await res.json();
  return data;
}

// ==========================================
// API Functions - Periodi Critici
// ==========================================

async function fetchPeriodiCritici(filters?: PeriodiCriticiFilters): Promise<PeriodoCritico[]> {
  const params = new URLSearchParams();
  if (filters?.attivo !== undefined) params.append('attivo', String(filters.attivo));
  if (filters?.data_inizio) params.append('data_inizio', filters.data_inizio);
  if (filters?.data_fine) params.append('data_fine', filters.data_fine);

  const url = `/api/periodi-critici${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nel recupero dei periodi critici');
  }

  const { data } = await res.json();
  return data;
}

async function createPeriodoCritico(input: CreatePeriodoCriticoInput): Promise<PeriodoCritico> {
  const res = await fetch('/api/periodi-critici', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nella creazione del periodo critico');
  }

  const { data } = await res.json();
  return data;
}

// ==========================================
// API Functions - Generazione Turni
// ==========================================

async function generaTurni(input: GeneraTurniInput): Promise<GenerationResult> {
  const res = await fetch('/api/ai/genera-turni', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nella generazione dei turni');
  }

  const { data } = await res.json();
  return data;
}

// ==========================================
// Hooks - Config AI
// ==========================================

export function useAIConfig() {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: fetchAIConfig,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });
}

export function useUpdateAIConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
    },
  });
}

// ==========================================
// Hooks - Periodi Critici
// ==========================================

export function usePeriodiCritici(filters?: PeriodiCriticiFilters) {
  return useQuery({
    queryKey: ['periodi-critici', filters],
    queryFn: () => fetchPeriodiCritici(filters),
    staleTime: 1000 * 60 * 5, // 5 minuti
  });
}

export function useCreatePeriodoCritico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPeriodoCritico,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodi-critici'] });
    },
  });
}

// ==========================================
// Hooks - Generazione Turni
// ==========================================

export function useGeneraTurni() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generaTurni,
    onSuccess: () => {
      // Invalida cache turni e assegnazioni
      queryClient.invalidateQueries({ queryKey: ['turni'] });
      queryClient.invalidateQueries({ queryKey: ['assegnazioni'] });
    },
  });
}

// ==========================================
// Utility Hooks
// ==========================================

// Hook per verificare se AI è abilitata
export function useIsAIEnabled() {
  const { data: config, isLoading } = useAIConfig();

  return {
    isEnabled: config?.modalita_ai && config.modalita_ai !== 'DISABLED',
    mode: config?.modalita_ai,
    isLoading,
  };
}

// Hook per periodi critici attivi nel range
export function usePeriodiCriticiAttivi(dataInizio?: string, dataFine?: string) {
  return usePeriodiCritici({
    attivo: true,
    data_inizio: dataInizio,
    data_fine: dataFine,
  });
}

// Hook per statistiche periodi critici
export function usePeriodiCriticiStats() {
  const { data: periodi, isLoading } = usePeriodiCritici();

  const oggi = new Date().toISOString().split('T')[0];

  const stats = {
    totali: periodi?.length || 0,
    attivi: periodi?.filter((p) => p.attivo).length || 0,
    inCorso:
      periodi?.filter((p) => p.attivo && p.data_inizio <= oggi && p.data_fine >= oggi).length || 0,
    futuri: periodi?.filter((p) => p.attivo && p.data_inizio > oggi).length || 0,
    perFonte: {
      manual: periodi?.filter((p) => p.fonte === 'MANUAL').length || 0,
      ai_detected: periodi?.filter((p) => p.fonte === 'AI_DETECTED').length || 0,
      hybrid: periodi?.filter((p) => p.fonte === 'HYBRID').length || 0,
    },
  };

  return { stats, isLoading };
}
