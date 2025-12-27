'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
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
  fonte: 'AI_DETECTED' | 'MANUAL' | 'HYBRID';
  confidenza_ai?: number;
  staff_minimo?: number;
  moltiplicatore_staff: number;
  blocca_preferenze: boolean;
  attivo: boolean;
  tipo_criticita?: string;
  created_at: string;
  updated_at: string;
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
  fonte?: 'AI_DETECTED' | 'MANUAL' | 'HYBRID';
  staff_minimo?: number;
  moltiplicatore_staff?: number;
  blocca_preferenze?: boolean;
  tipo_criticita?: string;
}

export interface PeriodoCriticoFilters {
  attivo?: boolean;
  data_inizio?: string;
  data_fine?: string;
}

// API Functions
async function fetchPeriodiCritici(
  filters?: PeriodoCriticoFilters
): Promise<PeriodoCritico[]> {
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

async function createPeriodoCritico(
  input: CreatePeriodoCriticoInput
): Promise<PeriodoCritico> {
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

// Hooks

export function usePeriodiCritici(filters?: PeriodoCriticoFilters) {
  return useQuery({
    queryKey: ['periodi-critici', filters],
    queryFn: () => fetchPeriodiCritici(filters),
    staleTime: 0, // Refetch immediato dopo invalidazione
  });
}

export function useCreatePeriodoCritico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPeriodoCritico,
    onSuccess: () => {
      // Forza refetch immediato di tutte le query periodi critici
      queryClient.invalidateQueries({
        queryKey: ['periodi-critici'],
        refetchType: 'all',
      });
    },
  });
}

// Hook per periodi critici attivi di una settimana
export function usePeriodiCriticiSettimana(weekStart: string, weekEnd: string) {
  return usePeriodiCritici({
    attivo: true,
    data_inizio: weekStart,
    data_fine: weekEnd,
  });
}
