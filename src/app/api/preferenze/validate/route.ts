/**
 * API Validazione Preferenze Real-time
 *
 * POST /api/preferenze/validate - Valida una preferenza PRIMA di salvarla
 *
 * Utile per il frontend per mostrare feedback immediato all'utente.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPreferenceValidator } from '@/lib/ai/scheduling';

const ValidatePreferenzaSchema = z.object({
  collaboratore_id: z.string().uuid('ID collaboratore non valido'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  ora_inizio: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato ora non valido')
    .optional(),
  ora_fine: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato ora non valido')
    .optional(),
  tipo: z.enum(['AVAILABLE', 'PREFERRED', 'UNAVAILABLE']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Valida body
    const body = await req.json();
    const validationResult = ValidatePreferenzaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Verifica accesso al collaboratore
    const { data: azienda } = await supabase
      .from('Azienda')
      .select('id')
      .eq('super_admin_email', user.email)
      .single();

    if (!azienda) {
      return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
    }

    const { data: collaboratore } = await supabase
      .from('Collaboratore')
      .select('id, nome, cognome, nucleo_id')
      .eq('id', input.collaboratore_id)
      .eq('azienda_id', azienda.id)
      .single();

    if (!collaboratore) {
      return NextResponse.json(
        { error: 'Collaboratore non trovato' },
        { status: 404 }
      );
    }

    // Esegui validazione
    const validator = getPreferenceValidator();
    const validation = await validator.validate({
      collaboratore_id: input.collaboratore_id,
      data: input.data,
      ora_inizio: input.ora_inizio,
      ora_fine: input.ora_fine,
      tipo: input.tipo || 'AVAILABLE',
    });

    // Restituisci risultato validazione
    return NextResponse.json({
      isValid: validation.isValid,
      status: validation.status,
      reason: validation.reason,
      details: validation.details,
      collaboratore: {
        id: collaboratore.id,
        nome: collaboratore.nome,
        cognome: collaboratore.cognome,
      },
    });
  } catch (error) {
    console.error('Error validating preferenza:', error);
    return NextResponse.json(
      { error: 'Errore nella validazione della preferenza' },
      { status: 500 }
    );
  }
}
