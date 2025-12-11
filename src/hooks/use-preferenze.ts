'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PreferenzaTurno,
  PreferenceType,
  PreferenceValidationStatus,
  ValidationResult,
} from '@/lib/ai/scheduling/types';

// Types
export interface Collaboratore {
  id: string;
  nome: string;
  cognome: string;
  email: string;
}

export interface PreferenzaWithCollab extends PreferenzaTurno {
  Collaboratore?: Collaboratore;
}

export interface CreatePreferenzaInput {
  collaboratore_id: string;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  tipo: PreferenceType;
  note?: string;
}

export interface PreferenzeFilters {
  collaboratore_id?: string;
  stato_validazione?: PreferenceValidationStatus;
  tipo?: PreferenceType;
  data_inizio?: string;
  data_fine?: string;
}

export interface ValidatePreferenzaInput {
  collaboratore_id: string;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  tipo?: PreferenceType;
}

export interface ValidationResponse {
  isValid: boolean;
  status: PreferenceValidationStatus;
  reason?: string;
  details?: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  collaboratore?: {
    id: string;
    nome: string;
    cognome: string;
  };
}

// API functions
async function fetchPreferenze(filters?: PreferenzeFilters): Promise<PreferenzaWithCollab[]> {
  const params = new URLSearchParams();
  if (filters?.collaboratore_id) params.append('collaboratore_id', filters.collaboratore_id);
  if (filters?.stato_validazione) params.append('stato_validazione', filters.stato_validazione);
  if (filters?.tipo) params.append('tipo', filters.tipo);
  if (filters?.data_inizio) params.append('data_inizio', filters.data_inizio);
  if (filters?.data_fine) params.append('data_fine', filters.data_fine);

  const url = `/api/preferenze${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nel recupero delle preferenze');
  }

  const { data } = await res.json();
  return data;
}

async function createPreferenza(
  input: CreatePreferenzaInput
): Promise<{ data: PreferenzaWithCollab; validation: ValidationResult }> {
  const res = await fetch('/api/preferenze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nella creazione della preferenza');
  }

  return await res.json();
}

async function validatePreferenza(input: ValidatePreferenzaInput): Promise<ValidationResponse> {
  const res = await fetch('/api/preferenze/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nella validazione della preferenza');
  }

  return await res.json();
}

// Hooks
export function usePreferenze(filters?: PreferenzeFilters) {
  return useQuery({
    queryKey: ['preferenze', filters],
    queryFn: () => fetchPreferenze(filters),
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useCreatePreferenza() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPreferenza,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferenze'] });
    },
  });
}

export function useValidatePreferenza() {
  return useMutation({
    mutationFn: validatePreferenza,
  });
}

// Hook per preferenze di un singolo collaboratore
export function usePreferenzeCollaboratore(collaboratore_id: string | null, periodo?: { inizio: string; fine: string }) {
  return useQuery({
    queryKey: ['preferenze', 'collaboratore', collaboratore_id, periodo],
    queryFn: () =>
      fetchPreferenze({
        collaboratore_id: collaboratore_id!,
        data_inizio: periodo?.inizio,
        data_fine: periodo?.fine,
      }),
    enabled: !!collaboratore_id,
    staleTime: 1000 * 60,
  });
}

// Hook per statistiche preferenze
export function usePreferenzeStats(filters?: PreferenzeFilters) {
  const { data: preferenze, isLoading } = usePreferenze(filters);

  const stats = {
    totali: preferenze?.length || 0,
    approvate: preferenze?.filter((p) => p.stato_validazione === 'APPROVED').length || 0,
    inAttesa: preferenze?.filter((p) => p.stato_validazione === 'PENDING').length || 0,
    rifiutate:
      preferenze?.filter((p) =>
        ['REJECTED_CONFLICT', 'REJECTED_CRITICAL', 'REJECTED_CONSTRAINT'].includes(
          p.stato_validazione
        )
      ).length || 0,
    perTipo: {
      available: preferenze?.filter((p) => p.tipo === 'AVAILABLE').length || 0,
      preferred: preferenze?.filter((p) => p.tipo === 'PREFERRED').length || 0,
      unavailable: preferenze?.filter((p) => p.tipo === 'UNAVAILABLE').length || 0,
    },
  };

  return { stats, isLoading };
}
