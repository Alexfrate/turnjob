"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAzienda } from './use-azienda';
import type { Nucleo, NucleoInsert, NucleoUpdate } from '@/types/database';

export function useNuclei() {
    const { aziendaId, isLoading: aziendaLoading } = useAzienda();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['nuclei', aziendaId],
        queryFn: async (): Promise<Nucleo[]> => {
            if (!aziendaId) return [];

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Nucleo')
                .select('*')
                .eq('azienda_id', aziendaId)
                .order('nome');

            if (error) {
                console.error('Error fetching nuclei:', error);
                throw error;
            }

            return data as Nucleo[];
        },
        enabled: !aziendaLoading && !!aziendaId,
    });

    const createMutation = useMutation({
        mutationFn: async (nucleo: Omit<NucleoInsert, 'azienda_id'>) => {
            if (!aziendaId) throw new Error('No azienda');

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Nucleo')
                .insert({
                    ...nucleo,
                    azienda_id: aziendaId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nuclei', aziendaId] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: NucleoUpdate }) => {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('Nucleo')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nuclei', aziendaId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient();

            const { error } = await supabase
                .from('Nucleo')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nuclei', aziendaId] });
        },
    });

    return {
        nuclei: query.data ?? [],
        isLoading: query.isLoading || aziendaLoading,
        error: query.error,
        refetch: query.refetch,
        // Mutations
        createNucleo: createMutation.mutate,
        updateNucleo: updateMutation.mutate,
        deleteNucleo: deleteMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

// Hook per ottenere un singolo nucleo
export function useNucleo(id: string | null) {
    const { aziendaId, isLoading: aziendaLoading } = useAzienda();

    return useQuery({
        queryKey: ['nucleo', id],
        queryFn: async () => {
            if (!id) return null;

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Nucleo')
                .select(`
                    *,
                    Appartenenza_Nucleo (
                        id,
                        data_inizio,
                        data_fine,
                        Collaboratore (
                            id,
                            nome,
                            cognome,
                            email
                        )
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
