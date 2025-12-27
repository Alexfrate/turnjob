import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema validazione per update collaboratore
const UpdateCollaboratoreSchema = z.object({
    nome: z.string().min(1).optional(),
    cognome: z.string().min(1).optional(),
    telefono: z.string().optional().nullable(),
    tipo_ore: z.enum(['settimanale_fisso', 'mensile', 'flessibile']).optional(),
    ore_settimanali: z.number().int().min(1).max(60).optional().nullable(),
    ore_min: z.number().int().min(1).max(60).optional().nullable(),
    ore_max: z.number().int().min(1).max(60).optional().nullable(),
    tipo_contratto: z.enum(['full_time', 'part_time', 'altro']).optional(),
    data_assunzione: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    attivo: z.boolean().optional(),
    ferie_annuali_custom: z.number().int().optional().nullable(),
    permessi_annuali_custom: z.number().int().optional().nullable(),
    riposi_settimanali_custom: z.number().int().optional().nullable(),
    tipo_riposo: z.enum(['giorni_interi', 'mezze_giornate', 'ore']).optional(),
    ore_riposo_settimanali: z.number().int().optional().nullable(),
}).partial();

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/collaboratori/[id] - Ottieni singolo collaboratore
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Ottieni collaboratore con nuclei e richieste recenti
        const { data: collaboratore, error } = await supabase
            .from('Collaboratore')
            .select(`
                *,
                Appartenenza_Nucleo (
                    id,
                    data_inizio,
                    data_fine,
                    Nucleo (
                        id,
                        nome,
                        colore,
                        mansione
                    )
                ),
                Richiesta (
                    id,
                    tipo,
                    data_inizio,
                    data_fine,
                    stato,
                    created_at
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Collaboratore non trovato' }, { status: 404 });
            }
            throw error;
        }

        // Filtra solo appartenenze attive
        const oggi = new Date().toISOString().split('T')[0];
        const collaboratoreConDati = {
            ...collaboratore,
            Appartenenza_Nucleo: collaboratore.Appartenenza_Nucleo?.filter(
                (app: { data_fine?: string | null }) => !app.data_fine || app.data_fine >= oggi
            ),
        };

        return NextResponse.json({ data: collaboratoreConDati });

    } catch (error) {
        console.error('Error fetching collaboratore:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero del collaboratore' },
            { status: 500 }
        );
    }
}

// PUT /api/collaboratori/[id] - Aggiorna collaboratore
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
        const validationResult = UpdateCollaboratoreSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const updateData = validationResult.data;

        // Aggiorna collaboratore
        const { data: collaboratore, error: updateError } = await supabase
            .from('Collaboratore')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Collaboratore non trovato' }, { status: 404 });
            }
            throw updateError;
        }

        return NextResponse.json({ data: collaboratore, success: true });

    } catch (error) {
        console.error('Error updating collaboratore:', error);
        return NextResponse.json(
            { error: 'Errore nell\'aggiornamento del collaboratore' },
            { status: 500 }
        );
    }
}

// DELETE /api/collaboratori/[id] - Disattiva collaboratore (soft delete)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Soft delete: disattiva invece di eliminare
        const { error: updateError } = await supabase
            .from('Collaboratore')
            .update({ attivo: false })
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }

        // Chiudi tutte le appartenenze ai nuclei
        const oggi = new Date().toISOString().split('T')[0];
        await supabase
            .from('Appartenenza_Nucleo')
            .update({ data_fine: oggi })
            .eq('collaboratore_id', id)
            .is('data_fine', null);

        return NextResponse.json({ success: true, message: 'Collaboratore disattivato' });

    } catch (error) {
        console.error('Error deleting collaboratore:', error);
        return NextResponse.json(
            { error: 'Errore nella disattivazione del collaboratore' },
            { status: 500 }
        );
    }
}
