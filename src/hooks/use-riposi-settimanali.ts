import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAzienda } from './use-azienda';

export interface RiposoSettimanale {
  id: string;
  azienda_id: string;
  collaboratore_id: string;
  settimana_inizio: string; // YYYY-MM-DD (lunedì della settimana)
  giorno_settimana: number; // 1-7 (Lun-Dom)
  tipo_riposo: 'intero' | 'mezza_mattina' | 'mezza_pomeriggio';
  fonte: 'MANUAL' | 'AI_ASSIGNED';
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiposoConCollaboratore extends RiposoSettimanale {
  collaboratore?: {
    id: string;
    nome: string;
    cognome: string;
    riposi_settimanali_custom?: number;
  };
}

// Helper per ottenere il lunedì della settimana
export function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

// Hook per ottenere i riposi di una settimana specifica
export function useRiposiSettimanali(weekStart: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['riposi-settimanali', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('RiposoSettimanale')
        .select(`
          *,
          collaboratore:Collaboratore(id, nome, cognome, riposi_settimanali_custom)
        `)
        .eq('settimana_inizio', weekStart)
        .order('giorno_settimana');

      if (error) throw error;
      return data as RiposoConCollaboratore[];
    },
    enabled: !!weekStart,
  });
}

// Hook per creare un riposo
export function useCreateRiposo() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { azienda } = useAzienda();

  return useMutation({
    mutationFn: async (riposo: Omit<RiposoSettimanale, 'id' | 'azienda_id' | 'created_at' | 'updated_at'>) => {
      if (!azienda?.id) throw new Error('Azienda non trovata');

      const { data, error } = await supabase
        .from('RiposoSettimanale')
        .insert({
          ...riposo,
          azienda_id: azienda.id,
        })
        .select(`
          *,
          collaboratore:Collaboratore(id, nome, cognome, riposi_settimanali_custom)
        `)
        .single();

      if (error) throw error;
      return data as RiposoConCollaboratore;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', variables.settimana_inizio] });
    },
  });
}

// Hook per eliminare un riposo
export function useDeleteRiposo() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, weekStart }: { id: string; weekStart: string }) => {
      const { error } = await supabase
        .from('RiposoSettimanale')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, weekStart };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', result.weekStart] });
    },
  });
}

// Hook per eliminare tutti i riposi di una settimana
export function useResetRiposiSettimana() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (weekStart: string) => {
      const { error } = await supabase
        .from('RiposoSettimanale')
        .delete()
        .eq('settimana_inizio', weekStart);

      if (error) throw error;
      return weekStart;
    },
    onSuccess: (weekStart) => {
      queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', weekStart] });
    },
  });
}

// Hook per assegnare riposi in batch (utile per AI)
export function useBatchAssignRiposi() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { azienda } = useAzienda();

  return useMutation({
    mutationFn: async (riposi: Omit<RiposoSettimanale, 'id' | 'azienda_id' | 'created_at' | 'updated_at'>[]) => {
      if (!azienda?.id) throw new Error('Azienda non trovata');
      if (riposi.length === 0) return [];

      const riposiWithAzienda = riposi.map(r => ({
        ...r,
        azienda_id: azienda.id,
      }));

      const { data, error } = await supabase
        .from('RiposoSettimanale')
        .upsert(riposiWithAzienda, {
          onConflict: 'collaboratore_id,settimana_inizio,giorno_settimana',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const weeks = [...new Set(variables.map(r => r.settimana_inizio))];
      weeks.forEach(week => {
        queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', week] });
      });
    },
  });
}

// Hook per assegnare riposi automaticamente tramite algoritmo AI
export function useAutoAssignRiposi() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { azienda } = useAzienda();

  return useMutation({
    mutationFn: async ({
      collaboratoreId,
      weekStart,
      existingRiposi,
      criticitaContinuative,
      turniSettimana,
      collaboratori,
    }: {
      collaboratoreId: string;
      weekStart: string;
      existingRiposi: RiposoConCollaboratore[];
      criticitaContinuative: Array<{ giorno_settimana: number; staff_extra?: number }>;
      turniSettimana: Array<{ giorno: number; collaboratori_ids: string[] }>;
      collaboratori: Array<{
        id: string;
        nome: string;
        cognome: string;
        tipo_riposo?: 'giorni_interi' | 'mezze_giornate' | 'ore';
        riposi_settimanali_custom?: number;
        ore_riposo_settimanali?: number;
      }>;
    }) => {
      if (!azienda?.id) throw new Error('Azienda non trovata');
      if (!weekStart) throw new Error('Data inizio settimana mancante');

      // Valida formato data
      const dateTest = new Date(weekStart);
      if (isNaN(dateTest.getTime())) {
        throw new Error(`Formato data non valido: ${weekStart}`);
      }

      // Importa dinamicamente l'algoritmo per evitare problemi di bundle
      const { assignRiposiAutomatici } = await import('@/lib/ai/shift-generation/riposi-assignment');

      const collaboratore = collaboratori.find(c => c.id === collaboratoreId);
      if (!collaboratore) throw new Error('Collaboratore non trovato');

      const tipoRiposo = collaboratore.tipo_riposo || 'giorni_interi';
      let quantita: number;

      if (tipoRiposo === 'ore') {
        // Converti ore in mezze giornate (4h = mezza giornata)
        const ore = collaboratore.ore_riposo_settimanali || 8;
        quantita = Math.ceil(ore / 4);
      } else {
        quantita = collaboratore.riposi_settimanali_custom ?? 2;
      }

      // Prepara i dati per l'algoritmo
      // Converti riposi esistenti nel formato richiesto
      const riposi_gia_assegnati = existingRiposi.map(r => ({
        collaboratore_id: r.collaboratore_id,
        giorno_settimana: r.giorno_settimana,
        tipo_riposo: r.tipo_riposo,
      }));

      // Converti criticità nel formato richiesto
      const criticita_continuative = criticitaContinuative.map((c, i) => ({
        id: `crit-${i}`,
        tipo: 'criticita',
        nome: `Criticità ${i + 1}`,
        giorno_settimana: c.giorno_settimana,
        staff_extra: c.staff_extra ?? 0,
        moltiplicatore_staff: 1,
      }));

      // Prepara slot occupati
      const slot_occupati = new Map<number, string[]>();
      turniSettimana.forEach(t => {
        slot_occupati.set(t.giorno, t.collaboratori_ids);
      });

      // Chiama l'algoritmo
      const result = assignRiposiAutomatici(
        {
          collaboratore_id: collaboratoreId,
          nome_completo: `${collaboratore.nome} ${collaboratore.cognome}`,
          tipo_riposo: tipoRiposo === 'ore' ? 'mezze_giornate' : tipoRiposo,
          quantita,
          settimana_inizio: weekStart,
        },
        {
          collaboratori: [],
          nuclei: [],
          criticita_continuative,
          richieste_approvate: [],
          riposi_gia_assegnati,
          slot_occupati,
        }
      );

      if (!result.success || result.riposi.length === 0) {
        throw new Error(result.reasoning || 'Impossibile assegnare riposi automaticamente');
      }

      // Salva i riposi generati
      const riposiToInsert = result.riposi.map(r => ({
        collaboratore_id: collaboratoreId,
        settimana_inizio: weekStart,
        giorno_settimana: r.giorno_settimana,
        tipo_riposo: r.tipo_riposo as 'intero' | 'mezza_mattina' | 'mezza_pomeriggio',
        fonte: 'AI_ASSIGNED' as const,
        note: `Auto-assegnato (confidenza: ${Math.round(r.confidence * 100)}%)`,
        azienda_id: azienda.id,
      }));

      const { data, error } = await supabase
        .from('RiposoSettimanale')
        .insert(riposiToInsert)
        .select();

      if (error) throw error;
      return { riposi: data, reasoning: result.reasoning };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', variables.weekStart] });
    },
  });
}

// Hook per assegnare riposi a TUTTI i collaboratori in un'unica operazione
export function useAssignAllRiposi() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { azienda } = useAzienda();

  return useMutation({
    mutationFn: async ({
      weekStart,
      existingRiposi,
      criticitaContinuative,
      turniSettimana,
      collaboratori,
      richiesteApprovate,
    }: {
      weekStart: string;
      existingRiposi: RiposoConCollaboratore[];
      criticitaContinuative: Array<{ giorno_settimana: number; staff_extra?: number }>;
      turniSettimana: Array<{ giorno: number; collaboratori_ids: string[] }>;
      collaboratori: Array<{
        id: string;
        nome: string;
        cognome: string;
        tipo_riposo?: 'giorni_interi' | 'mezze_giornate' | 'ore';
        riposi_settimanali_custom?: number;
        ore_riposo_settimanali?: number;
        attivo?: boolean;
      }>;
      richiesteApprovate?: Array<{
        collaboratore_id: string;
        data_inizio: string;
        data_fine: string;
        tipo: 'ferie' | 'permesso';
      }>;
    }) => {
      if (!azienda?.id) throw new Error('Azienda non trovata');
      if (!weekStart) throw new Error('Data inizio settimana mancante');

      const dateTest = new Date(weekStart);
      if (isNaN(dateTest.getTime())) {
        throw new Error(`Formato data non valido: ${weekStart}`);
      }

      const { assignRiposiMultipli } = await import('@/lib/ai/shift-generation/riposi-assignment');

      // Filtra solo collaboratori attivi
      const collaboratoriAttivi = collaboratori.filter(c => c.attivo !== false);

      // Filtra collaboratori che NON sono in ferie/permesso per l'intera settimana
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const collaboratoriDisponibili = collaboratoriAttivi.filter(c => {
        // Verifica se il collaboratore ha ferie/permessi che coprono tutta la settimana
        const richiesteCollaboratore = richiesteApprovate?.filter(r => r.collaboratore_id === c.id) || [];
        const inFerieIntereSettimana = richiesteCollaboratore.some(r => {
          const rInizio = new Date(r.data_inizio);
          const rFine = new Date(r.data_fine);
          return rInizio <= new Date(weekStart) && rFine >= weekEnd;
        });
        return !inFerieIntereSettimana;
      });

      // Prepara input per ogni collaboratore
      const inputs = collaboratoriDisponibili.map(c => {
        const tipoRiposo = c.tipo_riposo || 'giorni_interi';
        let quantita: number;

        if (tipoRiposo === 'ore') {
          const ore = c.ore_riposo_settimanali || 8;
          quantita = Math.ceil(ore / 4);
        } else {
          quantita = c.riposi_settimanali_custom ?? 2;
        }

        return {
          collaboratore_id: c.id,
          nome_completo: `${c.nome} ${c.cognome}`,
          tipo_riposo: tipoRiposo === 'ore' ? 'mezze_giornate' as const : tipoRiposo,
          quantita,
          settimana_inizio: weekStart,
        };
      });

      // Prepara contesto
      const riposi_gia_assegnati = existingRiposi.map(r => ({
        collaboratore_id: r.collaboratore_id,
        giorno_settimana: r.giorno_settimana,
        tipo_riposo: r.tipo_riposo,
      }));

      const criticita_formatted = criticitaContinuative.map((c, i) => ({
        id: `crit-${i}`,
        tipo: 'criticita',
        nome: `Criticità ${i + 1}`,
        giorno_settimana: c.giorno_settimana,
        staff_extra: c.staff_extra ?? 0,
        moltiplicatore_staff: 1,
      }));

      const slot_occupati = new Map<number, string[]>();
      turniSettimana.forEach(t => {
        slot_occupati.set(t.giorno, t.collaboratori_ids);
      });

      const richieste_formatted = (richiesteApprovate || []).map(r => ({
        collaboratore_id: r.collaboratore_id,
        data_inizio: r.data_inizio,
        data_fine: r.data_fine,
        tipo: r.tipo,
      }));

      // Esegui assegnazione multipla
      const results = assignRiposiMultipli(inputs, {
        collaboratori: [],
        nuclei: [],
        criticita_continuative: criticita_formatted,
        richieste_approvate: richieste_formatted,
        riposi_gia_assegnati,
        slot_occupati,
      });

      // Raccogli tutti i riposi generati
      const allRiposi = results.flatMap(r => r.riposi);
      const allWarnings = results.flatMap(r => r.warnings);
      const successCount = results.filter(r => r.success).length;

      if (allRiposi.length === 0) {
        throw new Error('Nessun riposo assegnato. Verifica la configurazione dei collaboratori.');
      }

      // Salva tutti i riposi in batch
      const riposiToInsert = allRiposi.map(r => ({
        collaboratore_id: r.collaboratore_id,
        settimana_inizio: weekStart,
        giorno_settimana: r.giorno_settimana,
        tipo_riposo: r.tipo_riposo as 'intero' | 'mezza_mattina' | 'mezza_pomeriggio',
        fonte: 'AI_ASSIGNED' as const,
        note: `Auto-assegnato batch (confidenza: ${Math.round(r.confidence * 100)}%)`,
        azienda_id: azienda.id,
      }));

      const { data, error } = await supabase
        .from('RiposoSettimanale')
        .upsert(riposiToInsert, {
          onConflict: 'collaboratore_id,settimana_inizio,giorno_settimana',
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;

      return {
        riposi: data,
        summary: {
          totaleCollaboratori: collaboratoriDisponibili.length,
          successCount,
          riposiAssegnati: allRiposi.length,
          warnings: allWarnings,
        },
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', variables.weekStart] });
      queryClient.invalidateQueries({ queryKey: ['collaboratori'] });
    },
  });
}

// Hook per salvare riposi suggeriti dall'AI in batch
export function useSaveAIRiposi() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { azienda } = useAzienda();

  return useMutation({
    mutationFn: async ({
      weekStart,
      riposi,
    }: {
      weekStart: string;
      riposi: Array<{
        collaboratore_id: string;
        giorno_settimana: number;
        tipo_riposo: 'intero' | 'mezza_mattina' | 'mezza_pomeriggio';
        note?: string;
      }>;
    }) => {
      if (!azienda?.id) throw new Error('Azienda non trovata');
      if (!weekStart) throw new Error('Data inizio settimana mancante');
      if (!riposi || riposi.length === 0) throw new Error('Nessun riposo da salvare');

      const riposiToInsert = riposi.map(r => ({
        ...r,
        settimana_inizio: weekStart,
        fonte: 'AI_ASSIGNED' as const,
        azienda_id: azienda.id,
      }));

      const { data, error } = await supabase
        .from('RiposoSettimanale')
        .upsert(riposiToInsert, {
          onConflict: 'collaboratore_id,settimana_inizio,giorno_settimana',
          ignoreDuplicates: false,
        })
        .select(`
          *,
          collaboratore:Collaboratore(id, nome, cognome, riposi_settimanali_custom)
        `);

      if (error) throw error;
      return data as RiposoConCollaboratore[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riposi-settimanali', variables.weekStart] });
      queryClient.invalidateQueries({ queryKey: ['collaboratori'] });
    },
  });
}
