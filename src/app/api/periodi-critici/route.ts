/**
 * API Periodi Critici
 *
 * GET /api/periodi-critici - Lista periodi critici
 * POST /api/periodi-critici - Crea nuovo periodo critico
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Schema validazione creazione periodo critico
const CreatePeriodoCriticoSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio').max(255),
  descrizione: z.string().optional(),
  data_inizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  data_fine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  ora_inizio: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato ora non valido')
    .optional(),
  ora_fine: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato ora non valido')
    .optional(),
  ricorrente: z.boolean().default(false),
  pattern_ricorrenza: z.string().optional(),
  fonte: z.enum(['AI_DETECTED', 'MANUAL', 'HYBRID']).default('MANUAL'),
  staff_minimo: z.number().int().positive().optional(),
  moltiplicatore_staff: z.number().min(1).default(1.5),
  blocca_preferenze: z.boolean().default(false),
});

// GET /api/periodi-critici
export async function GET(req: NextRequest) {
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

    // Ottieni azienda dell'utente
    const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

    if (!azienda || aziendaError) {
      return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const attivo = searchParams.get('attivo');
    const data_inizio = searchParams.get('data_inizio');
    const data_fine = searchParams.get('data_fine');

    // Query periodi critici
    let query = supabase
      .from('PeriodoCritico')
      .select('*')
      .eq('azienda_id', azienda.id)
      .order('data_inizio', { ascending: true });

    if (attivo !== null) {
      query = query.eq('attivo', attivo === 'true');
    }

    if (data_inizio) {
      query = query.gte('data_fine', data_inizio);
    }

    if (data_fine) {
      query = query.lte('data_inizio', data_fine);
    }

    const { data: periodi, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: periodi ?? [] });
  } catch (error) {
    console.error('Error fetching periodi critici:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei periodi critici' },
      { status: 500 }
    );
  }
}

// POST /api/periodi-critici
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

    // Ottieni azienda dell'utente
    const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

    if (!azienda || aziendaError) {
      return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
    }

    // Valida body
    const body = await req.json();
    const validationResult = CreatePeriodoCriticoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Validazione date
    if (input.data_inizio > input.data_fine) {
      return NextResponse.json(
        { error: 'La data di inizio deve essere precedente o uguale alla data di fine' },
        { status: 400 }
      );
    }

    // Crea periodo critico
    const { data: periodo, error: createError } = await supabase
      .from('PeriodoCritico')
      .insert({
        azienda_id: azienda.id,
        ...input,
        attivo: true,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({ data: periodo, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating periodo critico:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione del periodo critico' },
      { status: 500 }
    );
  }
}
