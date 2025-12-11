'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Collaboratore {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    telefono?: string;
}

export interface Nucleo {
    id: string;
    nome: string;
    colore: string;
    mansione: string;
}

export interface Assegnazione {
    id: string;
    turno_id: string;
    collaboratore_id: string;
    tipo: 'manuale' | 'richiesta_collaboratore' | 'suggerita_ai';
    confermato: boolean;
    confermato_il?: string;
    ore_lavorate?: number;
    Collaboratore?: Collaboratore;
}

export interface Turno {
    id: string;
    nucleo_id: string;
    data: string;
    ora_inizio: string;
    ora_fine: string;
    num_collaboratori_richiesti: number;
    completato: boolean;
    pubblicato: boolean;
    note?: string;
    suggerito_da_ai: boolean;
    ai_confidence?: number;
    created_at: string;
    updated_at: string;
    Nucleo?: Nucleo;
    Assegnazione_Turno?: Assegnazione[];
}

export interface CreateTurnoInput {
    nucleo_id: string;
    data: string;
    ora_inizio: string;
    ora_fine: string;
    num_collaboratori_richiesti?: number;
    note?: string;
    pubblicato?: boolean;
    assegnazioni?: {
        collaboratore_id: string;
        tipo?: 'manuale' | 'richiesta_collaboratore' | 'suggerita_ai';
    }[];
}

export interface UpdateTurnoInput {
    nucleo_id?: string;
    data?: string;
    ora_inizio?: string;
    ora_fine?: string;
    num_collaboratori_richiesti?: number;
    note?: string | null;
    pubblicato?: boolean;
    completato?: boolean;
}

export interface TurniFilters {
    data_inizio?: string;
    data_fine?: string;
    nucleo_id?: string;
    pubblicato?: boolean;
}

// API functions
async function fetchTurni(filters?: TurniFilters): Promise<Turno[]> {
    const params = new URLSearchParams();
    if (filters?.data_inizio) params.append('data_inizio', filters.data_inizio);
    if (filters?.data_fine) params.append('data_fine', filters.data_fine);
    if (filters?.nucleo_id) params.append('nucleo_id', filters.nucleo_id);
    if (filters?.pubblicato !== undefined) params.append('pubblicato', String(filters.pubblicato));

    const url = `/api/turni${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel recupero dei turni');
    }

    const { data } = await res.json();
    return data;
}

async function fetchTurno(id: string): Promise<Turno> {
    const res = await fetch(`/api/turni/${id}`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel recupero del turno');
    }

    const { data } = await res.json();
    return data;
}

async function createTurno(input: CreateTurnoInput): Promise<Turno> {
    const res = await fetch('/api/turni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nella creazione del turno');
    }

    const { data } = await res.json();
    return data;
}

async function updateTurno({ id, ...input }: UpdateTurnoInput & { id: string }): Promise<Turno> {
    const res = await fetch(`/api/turni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nell\'aggiornamento del turno');
    }

    const { data } = await res.json();
    return data;
}

async function deleteTurno(id: string): Promise<void> {
    const res = await fetch(`/api/turni/${id}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nell\'eliminazione del turno');
    }
}

// Assegnazioni
async function addAssegnazione(turnoId: string, collaboratore_id: string, tipo?: string): Promise<Assegnazione> {
    const res = await fetch(`/api/turni/${turnoId}/assegnazioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratore_id, tipo: tipo || 'manuale' }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nell\'assegnazione');
    }

    const { data } = await res.json();
    return data;
}

async function removeAssegnazione(turnoId: string, assegnazioneId: string): Promise<void> {
    const res = await fetch(`/api/turni/${turnoId}/assegnazioni`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assegnazione_id: assegnazioneId }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nella rimozione dell\'assegnazione');
    }
}

async function updateAssegnazione(
    turnoId: string,
    assegnazioneId: string,
    data: { confermato?: boolean; ore_lavorate?: number }
): Promise<Assegnazione> {
    const res = await fetch(`/api/turni/${turnoId}/assegnazioni`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assegnazione_id: assegnazioneId, ...data }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nell\'aggiornamento dell\'assegnazione');
    }

    const { data: result } = await res.json();
    return result;
}

// Hooks
export function useTurni(filters?: TurniFilters) {
    return useQuery({
        queryKey: ['turni', filters],
        queryFn: () => fetchTurni(filters),
        staleTime: 1000 * 60, // 1 minuto
    });
}

export function useTurno(id: string | null) {
    return useQuery({
        queryKey: ['turno', id],
        queryFn: () => fetchTurno(id!),
        enabled: !!id,
    });
}

export function useCreateTurno() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTurno,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['turni'] });
        },
    });
}

export function useUpdateTurno() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateTurno,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['turni'] });
            queryClient.invalidateQueries({ queryKey: ['turno', data.id] });
        },
    });
}

export function useDeleteTurno() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTurno,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['turni'] });
        },
    });
}

export function useAddAssegnazione() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ turnoId, collaboratoreId, tipo }: { turnoId: string; collaboratoreId: string; tipo?: string }) =>
            addAssegnazione(turnoId, collaboratoreId, tipo),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['turni'] });
            queryClient.invalidateQueries({ queryKey: ['turno', variables.turnoId] });
        },
    });
}

export function useRemoveAssegnazione() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ turnoId, assegnazioneId }: { turnoId: string; assegnazioneId: string }) =>
            removeAssegnazione(turnoId, assegnazioneId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['turni'] });
            queryClient.invalidateQueries({ queryKey: ['turno', variables.turnoId] });
        },
    });
}

export function useUpdateAssegnazione() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ turnoId, assegnazioneId, data }: {
            turnoId: string;
            assegnazioneId: string;
            data: { confermato?: boolean; ore_lavorate?: number }
        }) => updateAssegnazione(turnoId, assegnazioneId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['turni'] });
            queryClient.invalidateQueries({ queryKey: ['turno', variables.turnoId] });
        },
    });
}

// Hook combinato per uso nel calendario
export function useTurniCalendar(dataInizio: string, dataFine: string) {
    const { data: turni, isLoading, error, refetch } = useTurni({
        data_inizio: dataInizio,
        data_fine: dataFine,
    });

    const createTurnoMutation = useCreateTurno();
    const updateTurnoMutation = useUpdateTurno();
    const deleteTurnoMutation = useDeleteTurno();
    const addAssegnazioneMutation = useAddAssegnazione();
    const removeAssegnazioneMutation = useRemoveAssegnazione();

    return {
        turni: turni ?? [],
        isLoading,
        error,
        refetch,
        // Mutations
        createTurno: createTurnoMutation.mutateAsync,
        updateTurno: updateTurnoMutation.mutateAsync,
        deleteTurno: deleteTurnoMutation.mutateAsync,
        addAssegnazione: addAssegnazioneMutation.mutateAsync,
        removeAssegnazione: removeAssegnazioneMutation.mutateAsync,
        // Loading states
        isCreating: createTurnoMutation.isPending,
        isUpdating: updateTurnoMutation.isPending,
        isDeleting: deleteTurnoMutation.isPending,
    };
}
