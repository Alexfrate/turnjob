"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAzienda } from './use-azienda';
import type { CollaboratoreConNuclei, CollaboratoreInsert, CollaboratoreUpdate } from '@/types/database';

// Re-export types for use in other components
export type { CollaboratoreConNuclei, CollaboratoreInsert, CollaboratoreUpdate } from '@/types/database';

export function useCollaboratori() {
    const { aziendaId, isLoading: aziendaLoading } = useAzienda();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['collaboratori', aziendaId],
        queryFn: async (): Promise<CollaboratoreConNuclei[]> => {
            if (!aziendaId) return [];

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Collaboratore')
                .select(`
                    *,
                    Appartenenza_Nucleo (
                        id,
                        data_inizio,
                        data_fine,
                        Nucleo (
                            id,
                            nome,
                            colore,
                            mansione
                        )
                    )
                `)
                .eq('azienda_id', aziendaId)
                .order('cognome')
                .order('nome');

            if (error) {
                console.error('Error fetching collaboratori:', error);
                throw error;
            }

            return data as CollaboratoreConNuclei[];
        },
        enabled: !aziendaLoading && !!aziendaId,
    });

    const createMutation = useMutation({
        mutationFn: async (collaboratore: Omit<CollaboratoreInsert, 'azienda_id'>) => {
            if (!aziendaId) throw new Error('No azienda');

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Collaboratore')
                .insert({
                    ...collaboratore,
                    azienda_id: aziendaId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaboratori', aziendaId] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: CollaboratoreUpdate }) => {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('Collaboratore')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaboratori', aziendaId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient();

            const { error } = await supabase
                .from('Collaboratore')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaboratori', aziendaId] });
        },
    });

    // Mutation per assegnare un collaboratore a un nucleo
    const assignToNucleoMutation = useMutation({
        mutationFn: async ({
            collaboratoreId,
            nucleoId,
        }: {
            collaboratoreId: string;
            nucleoId: string;
        }) => {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('Appartenenza_Nucleo')
                .insert({
                    collaboratore_id: collaboratoreId,
                    nucleo_id: nucleoId,
                    data_inizio: new Date().toISOString().split('T')[0],
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaboratori', aziendaId] });
            queryClient.invalidateQueries({ queryKey: ['nuclei', aziendaId] });
        },
    });

    // Mutation per rimuovere un collaboratore da un nucleo
    const removeFromNucleoMutation = useMutation({
        mutationFn: async (appartenenzaId: string) => {
            const supabase = createClient();

            // Invece di eliminare, impostiamo data_fine
            const { error } = await supabase
                .from('Appartenenza_Nucleo')
                .update({
                    data_fine: new Date().toISOString().split('T')[0],
                })
                .eq('id', appartenenzaId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaboratori', aziendaId] });
            queryClient.invalidateQueries({ queryKey: ['nuclei', aziendaId] });
        },
    });

    // Collaboratori attivi (filtro)
    const collaboratoriAttivi = query.data?.filter(c => c.attivo) ?? [];

    return {
        collaboratori: query.data ?? [],
        collaboratoriAttivi,
        isLoading: query.isLoading || aziendaLoading,
        error: query.error,
        refetch: query.refetch,
        // Mutations
        createCollaboratore: createMutation.mutate,
        updateCollaboratore: updateMutation.mutate,
        deleteCollaboratore: deleteMutation.mutate,
        assignToNucleo: assignToNucleoMutation.mutate,
        removeFromNucleo: removeFromNucleoMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

// Hook per ottenere un singolo collaboratore
export function useCollaboratore(id: string | null) {
    const { aziendaId, isLoading: aziendaLoading } = useAzienda();

    return useQuery({
        queryKey: ['collaboratore', id],
        queryFn: async () => {
            if (!id) return null;

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Collaboratore')
                .select(`
                    *,
                    Appartenenza_Nucleo (
                        id,
                        data_inizio,
                        data_fine,
                        Nucleo (
                            id,
                            nome,
                            colore,
                            mansione
                        )
                    ),
                    Richiesta (
                        id,
                        tipo,
                        data_inizio,
                        data_fine,
                        stato
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data;
        },
        enabled: !aziendaLoading && !!id && !!aziendaId,
    });
}
