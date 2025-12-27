'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface CriticitaContinuativa {
  id: string;
  azienda_id: string;
  tipo: string;
  nome: string;
  descrizione?: string;
  giorno_settimana: number;
  giorno_nome?: string;
  ora_inizio?: string;
  ora_fine?: string;
  staff_extra: number;
  moltiplicatore_staff: number;
  priorita: number;
  fonte: 'AI_DETECTED' | 'MANUAL' | 'HYBRID';
  confidenza_ai?: number;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCriticitaContinuativaInput {
  tipo: string;
  nome: string;
  descrizione?: string;
  giorno_settimana: number;
  ora_inizio?: string;
  ora_fine?: string;
  staff_extra?: number;
  moltiplicatore_staff?: number;
  priorita?: number;
  fonte?: 'AI_DETECTED' | 'MANUAL' | 'HYBRID';
  confidenza_ai?: number;
  attivo?: boolean;
}

export interface UpdateCriticitaContinuativaInput {
  tipo?: string;
  nome?: string;
  descrizione?: string | null;
  giorno_settimana?: number;
  ora_inizio?: string | null;
  ora_fine?: string | null;
  staff_extra?: number;
  moltiplicatore_staff?: number;
  priorita?: number;
  attivo?: boolean;
}

export interface CriticitaContinuativaFilters {
  attivo?: boolean;
  giorno?: number;
  tipo?: string;
}

// API Functions
async function fetchCriticitaContinuative(
  filters?: CriticitaContinuativaFilters
): Promise<CriticitaContinuativa[]> {
  const params = new URLSearchParams();
  if (filters?.attivo !== undefined) params.append('attivo', String(filters.attivo));
  if (filters?.giorno !== undefined) params.append('giorno', String(filters.giorno));
  if (filters?.tipo) params.append('tipo', filters.tipo);

  const url = `/api/criticita-continuative${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nel recupero delle criticità continuative');
  }

  const { data } = await res.json();
  return data;
}

async function fetchCriticitaContinuativa(id: string): Promise<CriticitaContinuativa> {
  const res = await fetch(`/api/criticita-continuative/${id}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nel recupero della criticità');
  }

  const { data } = await res.json();
  return data;
}

async function createCriticitaContinuativa(
  input: CreateCriticitaContinuativaInput
): Promise<CriticitaContinuativa> {
  const res = await fetch('/api/criticita-continuative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nella creazione della criticità');
  }

  const { data } = await res.json();
  return data;
}

async function updateCriticitaContinuativa({
  id,
  ...input
}: UpdateCriticitaContinuativaInput & { id: string }): Promise<CriticitaContinuativa> {
  const res = await fetch(`/api/criticita-continuative/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Errore nell'aggiornamento della criticità");
  }

  const { data } = await res.json();
  return data;
}

async function deleteCriticitaContinuativa(id: string): Promise<void> {
  const res = await fetch(`/api/criticita-continuative/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Errore nell'eliminazione della criticità");
  }
}

// Hooks

export function useCriticitaContinuative(filters?: CriticitaContinuativaFilters) {
  return useQuery({
    queryKey: ['criticita-continuative', filters],
    queryFn: () => fetchCriticitaContinuative(filters),
    staleTime: 0, // Refetch immediato dopo invalidazione
  });
}

export function useCriticitaContinuativa(id: string) {
  return useQuery({
    queryKey: ['criticita-continuativa', id],
    queryFn: () => fetchCriticitaContinuativa(id),
    enabled: !!id,
  });
}

export function useCreateCriticitaContinuativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCriticitaContinuativa,
    onSuccess: () => {
      // Forza refetch immediato di tutte le query criticità
      queryClient.invalidateQueries({
        queryKey: ['criticita-continuative'],
        refetchType: 'all',
      });
    },
  });
}

export function useUpdateCriticitaContinuativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCriticitaContinuativa,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['criticita-continuative'] });
      queryClient.invalidateQueries({ queryKey: ['criticita-continuativa', data.id] });
    },
  });
}

export function useDeleteCriticitaContinuativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCriticitaContinuativa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criticita-continuative'] });
    },
  });
}

// Hook per criticità attive
export function useCriticitaContinuativeAttive() {
  return useCriticitaContinuative({ attivo: true });
}

// Hook per criticità di un giorno specifico
export function useCriticitaByGiorno(giorno: number) {
  return useCriticitaContinuative({ giorno, attivo: true });
}

// Hook per statistiche
export function useCriticitaContinuativeStats() {
  const { data: criticita, isLoading } = useCriticitaContinuative();

  const giorni = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const stats = {
    totali: criticita?.length || 0,
    attive: criticita?.filter((c) => c.attivo).length || 0,
    perGiorno: giorni.map((_, i) => ({
      giorno: giorni[i] || '',
      count: criticita?.filter((c) => c.giorno_settimana === i && c.attivo).length || 0,
    })).filter((_, i) => i > 0),
    perTipo: Object.entries(
      (criticita || []).reduce(
        (acc, c) => {
          acc[c.tipo] = (acc[c.tipo] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    ).map(([tipo, count]) => ({ tipo, count })),
    perFonte: {
      manual: criticita?.filter((c) => c.fonte === 'MANUAL').length || 0,
      ai_detected: criticita?.filter((c) => c.fonte === 'AI_DETECTED').length || 0,
      hybrid: criticita?.filter((c) => c.fonte === 'HYBRID').length || 0,
    },
  };

  return { stats, isLoading };
}
