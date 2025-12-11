/**
 * API Configurazione AI Scheduling
 *
 * GET /api/ai/config - Ottieni configurazione AI
 * PUT /api/ai/config - Aggiorna configurazione AI
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAISchedulingEngine } from '@/lib/ai/scheduling';

// Schema aggiornamento configurazione
const UpdateConfigSchema = z.object({
  modalita_ai: z.enum(['SUGGESTION', 'SEMI_AUTOMATIC', 'AUTONOMOUS', 'DISABLED']).optional(),
  soglia_confidenza: z.number().min(0).max(1).optional(),
  considera_preferenze: z.boolean().optional(),
  rispetta_vincoli_hard: z.boolean().optional(),
  notifica_conflitti: z.boolean().optional(),
  genera_report: z.boolean().optional(),
  max_ore_settimanali: z.number().int().min(1).max(60).optional(),
  min_ore_riposo: z.number().int().min(8).max(14).optional(),
});

// GET /api/ai/config
export async function GET() {
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

    // Ottieni configurazione
    const engine = getAISchedulingEngine();
    const config = await engine.getConfig(azienda.id);

    // Se non esiste, restituisci configurazione default
    if (!config) {
      return NextResponse.json({
        data: {
          azienda_id: azienda.id,
          modalita_ai: 'DISABLED',
          soglia_confidenza: 0.8,
          considera_preferenze: true,
          rispetta_vincoli_hard: true,
          notifica_conflitti: true,
          genera_report: false,
          max_ore_settimanali: 40,
          min_ore_riposo: 11,
          exists: false,
        },
      });
    }

    return NextResponse.json({ data: { ...config, exists: true } });
  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della configurazione AI' },
      { status: 500 }
    );
  }
}

// PUT /api/ai/config
export async function PUT(req: NextRequest) {
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

    // Valida body
    const body = await req.json();
    const validationResult = UpdateConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Aggiorna configurazione
    const engine = getAISchedulingEngine();
    const config = await engine.upsertConfig(azienda.id, validationResult.data);

    return NextResponse.json({ data: config, success: true });
  } catch (error) {
    console.error('Error updating AI config:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della configurazione AI' },
      { status: 500 }
    );
  }
}
