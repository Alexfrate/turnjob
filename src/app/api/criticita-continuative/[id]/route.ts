/**
 * API Criticità Continuative - Singola
 *
 * GET /api/criticita-continuative/[id] - Dettaglio criticità
 * PUT /api/criticita-continuative/[id] - Aggiorna criticità
 * DELETE /api/criticita-continuative/[id] - Elimina criticità
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';
import { validateDayForScheduling, getDayName } from '@/lib/utils/closed-days';

const GiorniSettimana = {
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
  7: 'Domenica',
} as const;

// Schema validazione aggiornamento criticità continuativa
const UpdateCriticitaContinuativaSchema = z.object({
  tipo: z.string().min(1).max(100).optional(),
  nome: z.string().min(1).max(255).optional(),
  descrizione: z.string().optional().nullable(),
  giorno_settimana: z.number().int().min(1).max(7).optional(),
  ora_inizio: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato ora non valido')
    .optional()
    .nullable(),
  ora_fine: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato ora non valido')
    .optional()
    .nullable(),
  staff_extra: z.number().int().min(0).optional(),
  moltiplicatore_staff: z.number().min(1).max(3).optional(),
  priorita: z.number().int().min(0).max(100).optional(),
  attivo: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Helper per verificare proprietà della criticità
async function verifyCriticitaOwnership(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  criticitaId: string,
  userEmail: string
) {
  // Ottieni azienda dell'utente (supporta super_admin E amministratori)
  const { azienda, error: aziendaError } = await getUserAzienda(supabase, userEmail);

  if (!azienda || aziendaError) {
    return { error: aziendaError || 'Azienda non trovata', status: 404 };
  }

  // Verifica che la criticità appartenga all'azienda
  const { data: criticita, error } = await supabase
    .from('CriticitaContinuativa')
    .select('*')
    .eq('id', criticitaId)
    .eq('azienda_id', azienda.id)
    .single();

  if (error || !criticita) {
    return { error: 'Criticità non trovata', status: 404 };
  }

  return { criticita, azienda };
}

// GET /api/criticita-continuative/[id]
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const result = await verifyCriticitaOwnership(supabase, id, user.email!);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const criticataArricchita = {
      ...result.criticita,
      giorno_nome:
        GiorniSettimana[result.criticita.giorno_settimana as keyof typeof GiorniSettimana],
    };

    return NextResponse.json({ data: criticataArricchita });
  } catch (error) {
    console.error('Error fetching criticità:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della criticità' },
      { status: 500 }
    );
  }
}

// PUT /api/criticita-continuative/[id]
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const result = await verifyCriticitaOwnership(supabase, id, user.email!);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Valida body
    const body = await req.json();
    const validationResult = UpdateCriticitaContinuativaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Validazione orari se entrambi presenti
    const oraInizio = input.ora_inizio ?? result.criticita.ora_inizio;
    const oraFine = input.ora_fine ?? result.criticita.ora_fine;
    if (oraInizio && oraFine && oraInizio >= oraFine) {
      return NextResponse.json(
        { error: "L'ora di inizio deve essere precedente all'ora di fine" },
        { status: 400 }
      );
    }

    // Validazione giorno: non permettere criticità per giorni di chiusura
    const giornoSettimana = input.giorno_settimana ?? result.criticita.giorno_settimana;
    const dayValidation = validateDayForScheduling(
      giornoSettimana,
      result.azienda.orario_apertura
    );

    if (!dayValidation.valid) {
      return NextResponse.json(
        {
          error: `Impossibile creare criticità per ${getDayName(giornoSettimana)}`,
          details: dayValidation.error,
          code: 'CLOSED_DAY_VALIDATION',
        },
        { status: 400 }
      );
    }

    // Aggiorna criticità
    const { data: criticita, error: updateError } = await supabase
      .from('CriticitaContinuativa')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const criticataArricchita = {
      ...criticita,
      giorno_nome: GiorniSettimana[criticita.giorno_settimana as keyof typeof GiorniSettimana],
    };

    return NextResponse.json({ data: criticataArricchita, success: true });
  } catch (error) {
    console.error('Error updating criticità:', error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento della criticità" },
      { status: 500 }
    );
  }
}

// DELETE /api/criticita-continuative/[id]
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const result = await verifyCriticitaOwnership(supabase, id, user.email!);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Elimina criticità
    const { error: deleteError } = await supabase
      .from('CriticitaContinuativa')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting criticità:', error);
    return NextResponse.json(
      { error: "Errore nell'eliminazione della criticità" },
      { status: 500 }
    );
  }
}
