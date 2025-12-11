import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Schema validazione per creazione nucleo
const CreateNucleoSchema = z.object({
    nome: z.string().min(1, 'Nome richiesto'),
    mansione: z.string().min(1, 'Mansione richiesta'),
    descrizione: z.string().optional(),
    colore: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#3b82f6'),
    membri_richiesti_min: z.number().int().min(1).optional().default(1),
    membri_richiesti_max: z.number().int().min(1).optional(),
});

// GET /api/nuclei - Lista tutti i nuclei dell'azienda
export async function GET() {
    try {
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Ottieni azienda dell'utente
        const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

        if (aziendaError || !azienda) {
            return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
        }

        // Ottieni nuclei con conteggio membri
        const { data: nuclei, error: nucleiError } = await supabase
            .from('Nucleo')
            .select(`
                *,
                Appartenenza_Nucleo!inner (
                    id,
                    Collaboratore (
                        id,
                        nome,
                        cognome,
                        attivo
                    )
                )
            `)
            .eq('azienda_id', azienda.id)
            .order('nome');

        if (nucleiError) {
            // Se errore per inner join vuoto, prova senza inner
            const { data: nucleiSemplici, error: errorSemplice } = await supabase
                .from('Nucleo')
                .select('*')
                .eq('azienda_id', azienda.id)
                .order('nome');

            if (errorSemplice) {
                throw errorSemplice;
            }

            return NextResponse.json({ data: nucleiSemplici ?? [] });
        }

        return NextResponse.json({ data: nuclei ?? [] });

    } catch (error) {
        console.error('Error fetching nuclei:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero dei nuclei' },
            { status: 500 }
        );
    }
}

// POST /api/nuclei - Crea nuovo nucleo
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Ottieni azienda dell'utente
        const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

        if (aziendaError || !azienda) {
            return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
        }

        // Valida dati in input
        const body = await req.json();
        const validationResult = CreateNucleoSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const nucleoData = validationResult.data;

        // Verifica che il nome sia unico per questa azienda
        const { data: existing } = await supabase
            .from('Nucleo')
            .select('id')
            .eq('azienda_id', azienda.id)
            .eq('nome', nucleoData.nome)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: 'Esiste già un nucleo con questo nome' },
                { status: 409 }
            );
        }

        // Crea nucleo
        const { data: nucleo, error: createError } = await supabase
            .from('Nucleo')
            .insert({
                azienda_id: azienda.id,
                ...nucleoData,
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        return NextResponse.json({ data: nucleo, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error creating nucleo:', error);
        return NextResponse.json(
            { error: 'Errore nella creazione del nucleo' },
            { status: 500 }
        );
    }
}
