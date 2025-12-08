"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useQueryClient } from '@tanstack/react-query';
import type { Azienda } from '@/types/database';

interface ActiveCompanyContextType {
  aziende: Azienda[];
  activeAzienda: Azienda | null;
  activeAziendaId: string | null;
  setActiveAziendaId: (id: string) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'turnjob_active_azienda_id';

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [activeAziendaId, setActiveAziendaIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchAziende = useCallback(async () => {
    if (!user?.email) {
      setAziende([]);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('Azienda')
      .select('*')
      .eq('super_admin_email', user.email)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching aziende:', error);
      setAziende([]);
    } else {
      setAziende(data || []);

      // Se non c'è azienda attiva valida, seleziona la prima
      if (data && data.length > 0) {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        const validId = data.find(a => a.id === storedId)?.id || data[0]?.id;

        if (validId && validId !== activeAziendaId) {
          setActiveAziendaIdState(validId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, validId);
          }
        }
      }
    }
    setIsLoading(false);
    setInitialized(true);
  }, [user?.email, activeAziendaId]);

  // Load on mount and when user changes
  useEffect(() => {
    if (!userLoading) {
      fetchAziende();
    }
  }, [userLoading, fetchAziende]);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setActiveAziendaIdState(e.newValue);
        // Invalida tutte le query quando cambia azienda da altro tab
        queryClient.invalidateQueries();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient]);

  const setActiveAziendaId = useCallback((id: string) => {
    setActiveAziendaIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
    // Invalida tutte le query quando cambia azienda
    queryClient.invalidateQueries();
  }, [queryClient]);

  const activeAzienda = aziende.find(a => a.id === activeAziendaId) || null;

  return (
    <ActiveCompanyContext.Provider value={{
      aziende,
      activeAzienda,
      activeAziendaId,
      setActiveAziendaId,
      isLoading: isLoading || userLoading,
      refetch: fetchAziende,
    }}>
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export function useActiveCompany() {
  const context = useContext(ActiveCompanyContext);
  if (!context) {
    throw new Error('useActiveCompany must be used within ActiveCompanyProvider');
  }
  return context;
}
