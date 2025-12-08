"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';
import { useActiveCompany } from '@/contexts/active-company-context';
import type { Azienda, AziendaUpdate } from '@/types/database';

/**
 * Hook principale per accedere all'azienda attiva.
 * Ora supporta multi-azienda usando il context.
 */
export function useAzienda() {
    const { activeAzienda, activeAziendaId, isLoading, refetch } = useActiveCompany();
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: async (updates: AziendaUpdate) => {
            if (!activeAziendaId) throw new Error('No azienda to update');

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Azienda')
                .update(updates)
                .eq('id', activeAziendaId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['azienda'] });
            // Refetch anche le aziende nel context
            refetch();
        },
    });

    return {
        azienda: activeAzienda,
        isLoading,
        error: null,
        refetch,
        updateAzienda: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
        // Helper computed values
        hasCompletedOnboarding: activeAzienda?.completato_onboarding ?? false,
        aziendaId: activeAziendaId,
    };
}

// Hook per ottenere l'amministratore corrente
export function useAmministratore() {
    const { user, loading: userLoading } = useUser();
    const { activeAziendaId, isLoading: aziendaLoading } = useActiveCompany();

    return useQuery({
        queryKey: ['amministratore', user?.email, activeAziendaId],
        queryFn: async () => {
            if (!user?.email || !activeAziendaId) return null;

            const supabase = createClient();

            const { data, error } = await supabase
                .from('Amministratore')
                .select('*')
                .eq('email', user.email)
                .eq('azienda_id', activeAziendaId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data;
        },
        enabled: !userLoading && !aziendaLoading && !!user?.email && !!activeAziendaId,
    });
}
