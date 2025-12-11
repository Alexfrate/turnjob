/**
 * Helper per verificare se l'utente è un super_admin
 * Controlla sia la tabella Azienda (super_admin_email) che Amministratore (ruolo)
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifica se l'email appartiene a un super_admin
 *
 * @param supabase - Client Supabase autenticato
 * @param userEmail - Email dell'utente da verificare
 * @returns true se l'utente è super_admin, false altrimenti
 */
export async function checkIsSuperAdmin(
  supabase: SupabaseClient,
  userEmail: string | undefined
): Promise<boolean> {
  if (!userEmail) return false;

  // Check 1: È super_admin_email di un'azienda?
  const { data: azienda } = await supabase
    .from('Azienda')
    .select('id')
    .eq('super_admin_email', userEmail)
    .limit(1)
    .maybeSingle();

  if (azienda) return true;

  // Check 2: Ha ruolo super_admin in Amministratore?
  const { data: admin } = await supabase
    .from('Amministratore')
    .select('ruolo')
    .eq('email', userEmail)
    .eq('ruolo', 'super_admin')
    .limit(1)
    .maybeSingle();

  return !!admin;
}

/**
 * Verifica super_admin e restituisce anche l'ID dell'azienda
 *
 * @param supabase - Client Supabase autenticato
 * @param userEmail - Email dell'utente da verificare
 * @returns { isSuperAdmin: boolean, aziendaId: string | null }
 */
export async function checkSuperAdminWithAzienda(
  supabase: SupabaseClient,
  userEmail: string | undefined
): Promise<{ isSuperAdmin: boolean; aziendaId: string | null }> {
  if (!userEmail) return { isSuperAdmin: false, aziendaId: null };

  // Check 1: È super_admin_email di un'azienda?
  const { data: azienda } = await supabase
    .from('Azienda')
    .select('id')
    .eq('super_admin_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (azienda) {
    return { isSuperAdmin: true, aziendaId: azienda.id };
  }

  // Check 2: Ha ruolo super_admin in Amministratore?
  const { data: admin } = await supabase
    .from('Amministratore')
    .select('ruolo, azienda_id')
    .eq('email', userEmail)
    .eq('ruolo', 'super_admin')
    .limit(1)
    .maybeSingle();

  if (admin) {
    return { isSuperAdmin: true, aziendaId: admin.azienda_id };
  }

  return { isSuperAdmin: false, aziendaId: null };
}
