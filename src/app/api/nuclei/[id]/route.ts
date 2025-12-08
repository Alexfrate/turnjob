import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema validazione per update nucleo
const UpdateNucleoSchema = z.object({
    nome: z.string().min(1).optional(),
    mansione: z.string().min(1).optional(),
    descrizione: z.string().optional().nullable(),
    colore: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    membri_richiesti_min: z.number().int().min(1).optional(),
    membri_richiesti_max: z.number().int().min(1).optional().nullable(),
}).partial();

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/nuclei/[id] - Ottieni singolo nucleo con membri
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Ottieni nucleo con membri attivi
        const { data: nucleo, error } = await supabase
            .from('Nucleo')
            .select(`
                *,
                Appartenenza_Nucleo (
                    id,
                    data_inizio,
                    data_fine,
                    Collaboratore (
                        id,
                        nome,
                        cognome,
                        email,
                        attivo,
                        tipo_ore,
                        ore_settimanali
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Nucleo non trovato' }, { status: 404 });
            }
            throw error;
        }

        // Filtra solo appartenenze attive (data_fine null o futura)
        const oggi = new Date().toISOString().split('T')[0];
        const nucleoConMembriAttivi = {
            ...nucleo,
            Appartenenza_Nucleo: nucleo.Appartenenza_Nucleo?.filter(
                (app: { data_fine?: string | null }) => !app.data_fine || app.data_fine >= oggi
            ),
        };

        return NextResponse.json({ data: nucleoConMembriAttivi });

    } catch (error) {
        console.error('Error fetching nucleo:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero del nucleo' },
            { status: 500 }
        );
    }
}

// PUT /api/nuclei/[id] - Aggiorna nucleo
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Valida dati in input
        const body = await req.json();
        const validationResult = UpdateNucleoSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const updateData = validationResult.data;

        // Se si sta cambiando il nome, verifica unicità
        if (updateData.nome) {
            const { data: existing } = await supabase
                .from('Nucleo')
                .select('id, azienda_id')
                .eq('id', id)
                .single();

            if (existing) {
                const { data: duplicate } = await supabase
                    .from('Nucleo')
                    .select('id')
                    .eq('azienda_id', existing.azienda_id)
                    .eq('nome', updateData.nome)
                    .neq('id', id)
                    .maybeSingle();

                if (duplicate) {
                    return NextResponse.json(
                        { error: 'Esiste già un nucleo con questo nome' },
                        { status: 409 }
                    );
                }
            }
        }

        // Aggiorna nucleo
        const { data: nucleo, error: updateError } = await supabase
            .from('Nucleo')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Nucleo non trovato' }, { status: 404 });
            }
            throw updateError;
        }

        return NextResponse.json({ data: nucleo, success: true });

    } catch (error) {
        console.error('Error updating nucleo:', error);
        return NextResponse.json(
            { error: 'Errore nell\'aggiornamento del nucleo' },
            { status: 500 }
        );
    }
}

// DELETE /api/nuclei/[id] - Elimina nucleo
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Verifica che non ci siano turni futuri associati
        const oggi = new Date().toISOString().split('T')[0];
        const { data: turniFuturi } = await supabase
            .from('Turno')
            .select('id')
            .eq('nucleo_id', id)
            .gte('data', oggi)
            .limit(1);

        if (turniFuturi && turniFuturi.length > 0) {
            return NextResponse.json(
                { error: 'Impossibile eliminare: ci sono turni futuri associati a questo nucleo' },
                { status: 409 }
            );
        }

        // Elimina nucleo (le appartenenze vengono eliminate automaticamente per CASCADE)
        const { error: deleteError } = await supabase
            .from('Nucleo')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true, message: 'Nucleo eliminato' });

    } catch (error) {
        console.error('Error deleting nucleo:', error);
        return NextResponse.json(
            { error: 'Errore nell\'eliminazione del nucleo' },
            { status: 500 }
        );
    }
}
