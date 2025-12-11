/**
 * API Generazione Turni AI
 *
 * POST /api/ai/genera-turni - Genera turni con AI
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAISchedulingEngine } from '@/lib/ai/scheduling';

// Schema richiesta generazione
const GenerazioneSchema = z.object({
  data_inizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  data_fine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  nucleo_ids: z.array(z.string().uuid()).optional(),
  options: z
    .object({
      rispetta_preferenze: z.boolean().default(true),
      ottimizza_equita: z.boolean().default(true),
      considera_periodi_critici: z.boolean().default(true),
      min_confidenza: z.number().min(0).max(1).default(0.7),
    })
    .optional(),
});

// POST /api/ai/genera-turni
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
    const validationResult = GenerazioneSchema.safeParse(body);

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

    // Verifica configurazione AI
    const engine = getAISchedulingEngine();
    const config = await engine.getConfig(azienda.id);

    if (!config || config.modalita_ai === 'DISABLED') {
      return NextResponse.json(
        { error: 'AI Scheduling non abilitato. Configura prima la modalità AI.' },
        { status: 400 }
      );
    }

    // Genera turni
    const result = await engine.generateSchedule({
      azienda_id: azienda.id,
      data_inizio: input.data_inizio,
      data_fine: input.data_fine,
      nucleo_ids: input.nucleo_ids,
      options: input.options,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Errore nella generazione dei turni',
          warnings: result.warnings,
          metriche: result.metriche,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        turni_generati: result.turni_generati,
        assegnazioni_proposte: result.assegnazioni_proposte,
        warnings: result.warnings,
        metriche: result.metriche,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error generating turni:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione dei turni' },
      { status: 500 }
    );
  }
}
