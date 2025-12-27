/**
 * Helper per ottenere l'azienda dell'utente loggato
 * Gestisce il caso multi-azienda (stesso super_admin)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { OrarioApertura } from '@/types/database';

export interface UserAzienda {
  id: string;
  nome: string;
  orario_apertura?: OrarioApertura;
}

export interface GetAziendaResult {
  azienda: UserAzienda | null;
  error: string | null;
}

/**
 * Ottiene l'azienda dell'utente loggato.
 *
 * Strategia:
 * 1. Prima cerca come super_admin_email
 * 2. Se trova più aziende, preferisce quella con collaboratori attivi
 * 3. Se non trova, cerca come Amministratore
 *
 * @param supabase - Client Supabase autenticato
 * @param userEmail - Email dell'utente loggato
 * @returns L'azienda trovata o null con errore
 */
export async function getUserAzienda(
  supabase: SupabaseClient,
  userEmail: string
): Promise<GetAziendaResult> {
  // Prima cerca come super_admin (prendi tutte le aziende)
  const { data: aziendeBySuperAdmin, error: superAdminError } = await supabase
    .from('Azienda')
    .select('id, nome, orario_apertura')
    .eq('super_admin_email', userEmail)
    .order('created_at', { ascending: true });

  if (superAdminError) {
    console.error('Error fetching azienda by super_admin:', superAdminError);
    return { azienda: null, error: 'Errore nel recupero dell\'azienda' };
  }

  if (aziendeBySuperAdmin && aziendeBySuperAdmin.length > 0) {
    // Se c'è una sola azienda, usala
    if (aziendeBySuperAdmin.length === 1) {
      return { azienda: aziendeBySuperAdmin[0], error: null };
    }

    // Se ci sono più aziende, preferisci quella con collaboratori attivi
    for (const azienda of aziendeBySuperAdmin) {
      const { count } = await supabase
        .from('Collaboratore')
        .select('*', { count: 'exact', head: true })
        .eq('azienda_id', azienda.id)
        .eq('attivo', true);

      if (count && count > 0) {
        return { azienda, error: null };
      }
    }

    // Fallback: usa la prima (più vecchia)
    return { azienda: aziendeBySuperAdmin[0], error: null };
  }

  // Se non trova come super_admin, cerca come Amministratore
  const { data: admin, error: adminError } = await supabase
    .from('Amministratore')
    .select('azienda_id, Azienda!inner(id, nome, orario_apertura)')
    .eq('email', userEmail)
    .eq('attivo', true)
    .limit(1)
    .single();

  if (adminError && adminError.code !== 'PGRST116') {
    console.error('Error fetching admin:', adminError);
    return { azienda: null, error: 'Errore nel recupero dell\'amministratore' };
  }

  if (admin && admin.Azienda) {
    const aziendaData = admin.Azienda as unknown as UserAzienda;
    return { azienda: aziendaData, error: null };
  }

  return { azienda: null, error: 'Azienda non trovata. Completa l\'onboarding per iniziare.' };
}
