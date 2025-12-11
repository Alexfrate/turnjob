/**
 * Helper per ottenere l'azienda dell'utente loggato
 * Gestisce il caso multi-azienda (stesso super_admin)
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface UserAzienda {
  id: string;
  nome: string;
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
 * 2. Se trova più aziende, usa la prima (più recente)
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
  // Prima cerca come super_admin
  const { data: aziendeBySuperAdmin, error: superAdminError } = await supabase
    .from('Azienda')
    .select('id, nome')
    .eq('super_admin_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(1);

  if (superAdminError) {
    console.error('Error fetching azienda by super_admin:', superAdminError);
    return { azienda: null, error: 'Errore nel recupero dell\'azienda' };
  }

  if (aziendeBySuperAdmin && aziendeBySuperAdmin.length > 0) {
    return { azienda: aziendeBySuperAdmin[0], error: null };
  }

  // Se non trova come super_admin, cerca come Amministratore
  const { data: admin, error: adminError } = await supabase
    .from('Amministratore')
    .select('azienda_id, Azienda!inner(id, nome)')
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
