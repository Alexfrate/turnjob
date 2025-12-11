'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Collaboratore {
    id: string;
    nome: string;
    cognome: string;
    email: string;
}

export type TipoRichiesta = 'ferie' | 'permesso' | 'riposo';
export type StatoRichiesta = 'in_attesa' | 'approvata' | 'rifiutata' | 'cancellata';

export interface Richiesta {
    id: string;
    collaboratore_id: string;
    tipo: TipoRichiesta;
    data_inizio: string;
    data_fine: string;
    ore_richieste?: number;
    stato: StatoRichiesta;
    note_collaboratore?: string;
    note_admin?: string;
    motivo_rifiuto?: string;
    rivista_da?: string;
    rivista_il?: string;
    created_at: string;
    updated_at: string;
    Collaboratore?: Collaboratore;
}

export interface CreateRichiestaInput {
    collaboratore_id: string;
    tipo: TipoRichiesta;
    data_inizio: string;
    data_fine: string;
    ore_richieste?: number;
    note_collaboratore?: string;
}

export interface UpdateRichiestaInput {
    stato?: 'approvata' | 'rifiutata' | 'cancellata';
    note_admin?: string;
    motivo_rifiuto?: string;
}

export interface RichiesteFilters {
    stato?: StatoRichiesta;
    tipo?: TipoRichiesta;
    collaboratore_id?: string;
    data_inizio?: string;
    data_fine?: string;
}

// API functions
async function fetchRichieste(filters?: RichiesteFilters): Promise<Richiesta[]> {
    const params = new URLSearchParams();
    if (filters?.stato) params.append('stato', filters.stato);
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.collaboratore_id) params.append('collaboratore_id', filters.collaboratore_id);
    if (filters?.data_inizio) params.append('data_inizio', filters.data_inizio);
    if (filters?.data_fine) params.append('data_fine', filters.data_fine);

    const url = `/api/richieste${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel recupero delle richieste');
    }

    const { data } = await res.json();
    return data;
}

async function fetchRichiesta(id: string): Promise<Richiesta> {
    const res = await fetch(`/api/richieste/${id}`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel recupero della richiesta');
    }

    const { data } = await res.json();
    return data;
}

async function createRichiesta(input: CreateRichiestaInput): Promise<Richiesta> {
    const res = await fetch('/api/richieste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nella creazione della richiesta');
    }

    const { data } = await res.json();
    return data;
}

async function updateRichiesta({ id, ...input }: UpdateRichiestaInput & { id: string }): Promise<Richiesta> {
    const res = await fetch(`/api/richieste/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nell\'aggiornamento della richiesta');
    }

    const { data } = await res.json();
    return data;
}

async function deleteRichiesta(id: string): Promise<void> {
    const res = await fetch(`/api/richieste/${id}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nell\'eliminazione della richiesta');
    }
}

// Hooks
export function useRichieste(filters?: RichiesteFilters) {
    return useQuery({
        queryKey: ['richieste', filters],
        queryFn: () => fetchRichieste(filters),
        staleTime: 1000 * 60, // 1 minuto
    });
}

export function useRichiesta(id: string | null) {
    return useQuery({
        queryKey: ['richiesta', id],
        queryFn: () => fetchRichiesta(id!),
        enabled: !!id,
    });
}

export function useCreateRichiesta() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createRichiesta,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['richieste'] });
        },
    });
}

export function useUpdateRichiesta() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateRichiesta,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['richieste'] });
            queryClient.invalidateQueries({ queryKey: ['richiesta', data.id] });
        },
    });
}

export function useDeleteRichiesta() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteRichiesta,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['richieste'] });
        },
    });
}

// Utility hooks
export function useApprovaRichiesta() {
    const updateMutation = useUpdateRichiesta();

    return {
        ...updateMutation,
        approva: (id: string, note_admin?: string) =>
            updateMutation.mutateAsync({ id, stato: 'approvata', note_admin }),
    };
}

export function useRifiutaRichiesta() {
    const updateMutation = useUpdateRichiesta();

    return {
        ...updateMutation,
        rifiuta: (id: string, motivo_rifiuto: string, note_admin?: string) =>
            updateMutation.mutateAsync({ id, stato: 'rifiutata', motivo_rifiuto, note_admin }),
    };
}

// Hook per statistiche richieste
export function useRichiesteStats() {
    const { data: richieste, isLoading } = useRichieste();

    const stats = {
        totali: richieste?.length || 0,
        inAttesa: richieste?.filter(r => r.stato === 'in_attesa').length || 0,
        approvate: richieste?.filter(r => r.stato === 'approvata').length || 0,
        rifiutate: richieste?.filter(r => r.stato === 'rifiutata').length || 0,
        perTipo: {
            ferie: richieste?.filter(r => r.tipo === 'ferie').length || 0,
            permesso: richieste?.filter(r => r.tipo === 'permesso').length || 0,
            riposo: richieste?.filter(r => r.tipo === 'riposo').length || 0,
        },
    };

    return { stats, isLoading };
}
