/**
 * API Criticità Continuative
 *
 * GET /api/criticita-continuative - Lista criticità continuative
 * POST /api/criticita-continuative - Crea nuova criticità continuativa
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Giorni della settimana
const GiorniSettimana = {
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
  7: 'Domenica',
} as const;

// Schema validazione creazione criticità continuativa
const CreateCriticitaContinuativaSchema = z.object({
  tipo: z.string().min(1, 'Tipo obbligatorio').max(100),
  nome: z.string().min(1, 'Nome obbligatorio').max(255),
  descrizione: z.string().optional(),
  giorno_settimana: z.number().int().min(1).max(7),
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
  staff_extra: z.number().int().min(0).default(0),
  moltiplicatore_staff: z.number().min(1).max(3).default(1.0),
  priorita: z.number().int().min(0).max(100).default(50),
  fonte: z.enum(['AI_DETECTED', 'MANUAL', 'HYBRID']).default('MANUAL'),
  confidenza_ai: z.number().min(0).max(1).optional().nullable(),
  attivo: z.boolean().default(true),
});

// GET /api/criticita-continuative
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
    const giorno = searchParams.get('giorno');
    const tipo = searchParams.get('tipo');

    // Query criticità continuative
    let query = supabase
      .from('CriticitaContinuativa')
      .select('*')
      .eq('azienda_id', azienda.id)
      .order('giorno_settimana', { ascending: true })
      .order('ora_inizio', { ascending: true });

    if (attivo !== null) {
      query = query.eq('attivo', attivo === 'true');
    }

    if (giorno) {
      query = query.eq('giorno_settimana', parseInt(giorno));
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data: criticita, error } = await query;

    if (error) {
      throw error;
    }

    // Arricchisci con nome giorno
    const criticataArricchite = (criticita ?? []).map((c) => ({
      ...c,
      giorno_nome: GiorniSettimana[c.giorno_settimana as keyof typeof GiorniSettimana],
    }));

    return NextResponse.json({ data: criticataArricchite });
  } catch (error) {
    console.error('Error fetching criticità continuative:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle criticità continuative' },
      { status: 500 }
    );
  }
}

// POST /api/criticita-continuative
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
    const validationResult = CreateCriticitaContinuativaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Validazione orari se entrambi presenti
    if (input.ora_inizio && input.ora_fine && input.ora_inizio >= input.ora_fine) {
      return NextResponse.json(
        { error: "L'ora di inizio deve essere precedente all'ora di fine" },
        { status: 400 }
      );
    }

    // Crea criticità continuativa
    const { data: criticita, error: createError } = await supabase
      .from('CriticitaContinuativa')
      .insert({
        azienda_id: azienda.id,
        ...input,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Arricchisci con nome giorno
    const criticataArricchita = {
      ...criticita,
      giorno_nome: GiorniSettimana[criticita.giorno_settimana as keyof typeof GiorniSettimana],
    };

    return NextResponse.json({ data: criticataArricchita, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating criticità continuativa:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione della criticità continuativa' },
      { status: 500 }
    );
  }
}
