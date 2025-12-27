'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRichieste, useCreateRichiesta, type Richiesta, type CreateRichiestaInput } from './use-richieste';

/**
 * Hook per gestire richieste ferie/permessi di un singolo collaboratore
 */
export function useRichiesteCollaboratore(collaboratoreId: string | null) {
  const { data: allRichieste, isLoading, error } = useRichieste(
    collaboratoreId ? { collaboratore_id: collaboratoreId } : undefined
  );

  // Filtra per collaboratore (doppia sicurezza)
  const richieste = allRichieste?.filter(r => r.collaboratore_id === collaboratoreId) || [];

  // Raggruppa per stato
  const inAttesa = richieste.filter(r => r.stato === 'in_attesa');
  const approvate = richieste.filter(r => r.stato === 'approvata');
  const rifiutate = richieste.filter(r => r.stato === 'rifiutata');

  // Statistiche annuali
  const currentYear = new Date().getFullYear();
  const richiesteAnnoCorrente = richieste.filter(r => {
    const anno = new Date(r.data_inizio).getFullYear();
    return anno === currentYear && r.stato === 'approvata';
  });

  // Calcola giorni ferie usati
  const giorniFerieUsati = richiesteAnnoCorrente
    .filter(r => r.tipo === 'ferie')
    .reduce((acc, r) => {
      const inizio = new Date(r.data_inizio);
      const fine = new Date(r.data_fine);
      const giorni = Math.ceil((fine.getTime() - inizio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + giorni;
    }, 0);

  // Calcola ore permessi usate
  const orePermessiUsate = richiesteAnnoCorrente
    .filter(r => r.tipo === 'permesso')
    .reduce((acc, r) => acc + (r.ore_richieste || 8), 0);

  return {
    richieste,
    inAttesa,
    approvate,
    rifiutate,
    isLoading,
    error,
    stats: {
      giorniFerieUsati,
      orePermessiUsate,
      totaleRichieste: richieste.length,
      richiesteInAttesa: inAttesa.length,
    },
  };
}

/**
 * Hook per creare una richiesta per un collaboratore specifico
 */
export function useCreateRichiestaCollaboratore() {
  const mutation = useCreateRichiesta();
  const queryClient = useQueryClient();

  const createRichiesta = async (
    collaboratoreId: string,
    data: Omit<CreateRichiestaInput, 'collaboratore_id'>
  ) => {
    const result = await mutation.mutateAsync({
      ...data,
      collaboratore_id: collaboratoreId,
    });
    // Invalida anche la cache del collaboratore
    queryClient.invalidateQueries({ queryKey: ['collaboratore', collaboratoreId] });
    queryClient.invalidateQueries({ queryKey: ['richieste'] });
    return result;
  };

  return {
    createRichiesta,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Hook per ottenere richieste approvate per una settimana specifica
 * Utile per il pannello disponibilità in Turni AI
 */
export function useRichiesteSettimana(weekStart: string, weekEnd: string) {
  const { data: richieste, isLoading } = useRichieste({
    stato: 'approvata',
    data_inizio: weekStart,
    data_fine: weekEnd,
  });

  // Filtra richieste che si sovrappongono con la settimana
  const richiesteSettimana = richieste?.filter(r => {
    const rInizio = new Date(r.data_inizio);
    const rFine = new Date(r.data_fine);
    const sInizio = new Date(weekStart);
    const sFine = new Date(weekEnd);

    // Verifica sovrapposizione
    return rInizio <= sFine && rFine >= sInizio;
  }) || [];

  // Raggruppa per collaboratore
  const perCollaboratore = richiesteSettimana.reduce((acc, r) => {
    if (!acc[r.collaboratore_id]) {
      acc[r.collaboratore_id] = [];
    }
    acc[r.collaboratore_id].push(r);
    return acc;
  }, {} as Record<string, Richiesta[]>);

  return {
    richieste: richiesteSettimana,
    perCollaboratore,
    isLoading,
  };
}

/**
 * Verifica se un collaboratore ha ferie/permessi approvati per un giorno specifico
 */
export function hasRichiestaApprovataSulGiorno(
  richieste: Richiesta[],
  collaboratoreId: string,
  data: string
): Richiesta | undefined {
  const dataCheck = new Date(data);

  return richieste.find(r => {
    if (r.collaboratore_id !== collaboratoreId) return false;
    if (r.stato !== 'approvata') return false;

    const inizio = new Date(r.data_inizio);
    const fine = new Date(r.data_fine);

    return dataCheck >= inizio && dataCheck <= fine;
  });
}
