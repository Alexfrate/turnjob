/**
 * API Preferenze Turni
 *
 * GET /api/preferenze - Lista preferenze (con filtri)
 * POST /api/preferenze - Crea nuova preferenza con validazione automatica
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPreferenceValidator } from '@/lib/ai/scheduling';

// Schema validazione creazione preferenza
const CreatePreferenzaSchema = z.object({
  collaboratore_id: z.string().uuid('ID collaboratore non valido'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (YYYY-MM-DD)'),
  ora_inizio: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato ora non valido (HH:MM)')
    .optional(),
  ora_fine: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato ora non valido (HH:MM)')
    .optional(),
  tipo: z.enum(['AVAILABLE', 'PREFERRED', 'UNAVAILABLE']),
  note: z.string().optional(),
});

// Schema filtri
const FilterSchema = z.object({
  collaboratore_id: z.string().uuid().optional(),
  stato_validazione: z
    .enum([
      'PENDING',
      'APPROVED',
      'REJECTED_CONFLICT',
      'REJECTED_CRITICAL',
      'REJECTED_CONSTRAINT',
    ])
    .optional(),
  tipo: z.enum(['AVAILABLE', 'PREFERRED', 'UNAVAILABLE']).optional(),
  data_inizio: z.string().optional(),
  data_fine: z.string().optional(),
});

// GET /api/preferenze
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
    const { data: azienda } = await supabase
      .from('Azienda')
      .select('id')
      .eq('super_admin_email', user.email)
      .single();

    if (!azienda) {
      return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const filters = FilterSchema.safeParse({
      collaboratore_id: searchParams.get('collaboratore_id'),
      stato_validazione: searchParams.get('stato_validazione'),
      tipo: searchParams.get('tipo'),
      data_inizio: searchParams.get('data_inizio'),
      data_fine: searchParams.get('data_fine'),
    });

    // Ottieni collaboratori dell'azienda
    const { data: collaboratori } = await supabase
      .from('Collaboratore')
      .select('id')
      .eq('azienda_id', azienda.id);

    const collaboratoriIds = (collaboratori || []).map((c) => c.id);

    if (collaboratoriIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Query preferenze
    let query = supabase
      .from('PreferenzaTurno')
      .select(
        `
        *,
        Collaboratore (id, nome, cognome, email)
      `
      )
      .in('collaboratore_id', collaboratoriIds)
      .order('data', { ascending: true });

    // Applica filtri
    if (filters.success) {
      const { collaboratore_id, stato_validazione, tipo, data_inizio, data_fine } =
        filters.data;

      if (collaboratore_id) {
        query = query.eq('collaboratore_id', collaboratore_id);
      }
      if (stato_validazione) {
        query = query.eq('stato_validazione', stato_validazione);
      }
      if (tipo) {
        query = query.eq('tipo', tipo);
      }
      if (data_inizio) {
        query = query.gte('data', data_inizio);
      }
      if (data_fine) {
        query = query.lte('data', data_fine);
      }
    }

    const { data: preferenze, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: preferenze ?? [] });
  } catch (error) {
    console.error('Error fetching preferenze:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle preferenze' },
      { status: 500 }
    );
  }
}

// POST /api/preferenze
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
    const validationResult = CreatePreferenzaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Verifica che il collaboratore appartenga all'azienda dell'utente
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
      .eq('attivo', true)
      .single();

    if (!collaboratore) {
      return NextResponse.json(
        { error: 'Collaboratore non trovato o non attivo' },
        { status: 404 }
      );
    }

    // Verifica che non esista già una preferenza per lo stesso slot
    const { data: esistente } = await supabase
      .from('PreferenzaTurno')
      .select('id')
      .eq('collaboratore_id', input.collaboratore_id)
      .eq('data', input.data)
      .eq('ora_inizio', input.ora_inizio || '')
      .single();

    if (esistente) {
      return NextResponse.json(
        { error: 'Esiste già una preferenza per questo slot' },
        { status: 409 }
      );
    }

    // *** VALIDAZIONE AUTOMATICA ***
    const validator = getPreferenceValidator();
    const validation = await validator.validate({
      collaboratore_id: input.collaboratore_id,
      data: input.data,
      ora_inizio: input.ora_inizio,
      ora_fine: input.ora_fine,
      tipo: input.tipo,
    });

    // Crea preferenza con stato validazione
    const { data: preferenza, error: createError } = await supabase
      .from('PreferenzaTurno')
      .insert({
        collaboratore_id: input.collaboratore_id,
        data: input.data,
        ora_inizio: input.ora_inizio,
        ora_fine: input.ora_fine,
        tipo: input.tipo,
        note: input.note,
        stato_validazione: validation.status,
        motivo_rifiuto: validation.reason,
        validata_il: new Date().toISOString(),
      })
      .select(
        `
        *,
        Collaboratore (id, nome, cognome, email)
      `
      )
      .single();

    if (createError) {
      throw createError;
    }

    // Risposta con dettagli validazione
    return NextResponse.json(
      {
        data: preferenza,
        validation: {
          status: validation.status,
          isValid: validation.isValid,
          reason: validation.reason,
          details: validation.details,
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating preferenza:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione della preferenza' },
      { status: 500 }
    );
  }
}
