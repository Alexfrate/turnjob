"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';

export function useCompany() {
  const { user, loading } = useUser();

  return useQuery({
    queryKey: ['company', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const supabase = createClient();

      // 1. Check current metadata
      if (user.user_metadata?.companyId) {
        const { data: company, error } = await supabase
          .from('Company')
          .select('*')
          .eq('id', user.user_metadata.companyId)
          .single();

        if (error) throw error;
        return company;
      }

      // 2. Fallback: Try to find company via Position (sometimes has different RLS)
      try {
        const { data: positionData } = await supabase
          .from('Position')
          .select('companyId, User!inner(id)')
          .eq('User.id', user.id)
          .limit(1)
          .maybeSingle();

        if (positionData?.companyId) {
          // Found it! Update metadata and return company
          await supabase.auth.updateUser({
            data: { companyId: positionData.companyId }
          });

          const { data: company } = await supabase
            .from('Company')
            .select('*')
            .eq('id', positionData.companyId)
            .single();

          return company;
        }
      } catch (e) {
        console.warn('Position fallback failed', e);
      }

      // 3. Last resort: Try Company relation (known to fail with RLS recursion but worth keeping as final attempt)
      try {
        const { data: companyData } = await supabase
          .from('Company')
          .select('*, User!inner(id)')
          .eq('User.id', user.id)
          .maybeSingle();

        if (companyData) {
          await supabase.auth.updateUser({
            data: { companyId: companyData.id }
          });
          return companyData;
        }
      } catch (e) {
        console.warn('Company relation fallback failed', e);
      }

      // If we reach here, we really can't find the company.
      // Return null so the UI can handle it instead of crashing/infinite loading.
      return null;
    },
    enabled: !loading && !!user,
  });
}