import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Schema validazione per creazione collaboratore
const CreateCollaboratoreSchema = z.object({
    nome: z.string().min(1, 'Nome richiesto'),
    cognome: z.string().min(1, 'Cognome richiesto'),
    email: z.string().email('Email non valida'),
    telefono: z.string().optional(),
    tipo_ore: z.enum(['settimanale_fisso', 'mensile', 'flessibile']).default('settimanale_fisso'),
    ore_settimanali: z.number().int().min(1).max(60).optional(),
    ore_min: z.number().int().min(1).max(60).optional(),
    ore_max: z.number().int().min(1).max(60).optional(),
    tipo_contratto: z.enum(['full_time', 'part_time', 'altro']).optional().default('full_time'),
    data_assunzione: z.string().optional(),
    note: z.string().optional(),
    nuclei_ids: z.array(z.string().uuid()).optional(),
});

// GET /api/collaboratori - Lista tutti i collaboratori dell'azienda
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

        // Ottieni collaboratori con nuclei
        const { data: collaboratori, error } = await supabase
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
                )
            `)
            .eq('azienda_id', azienda.id)
            .order('cognome')
            .order('nome');

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: collaboratori ?? [] });

    } catch (error) {
        console.error('Error fetching collaboratori:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero dei collaboratori' },
            { status: 500 }
        );
    }
}

// POST /api/collaboratori - Crea nuovo collaboratore
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
        const validationResult = CreateCollaboratoreSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { nuclei_ids, ...collaboratoreData } = validationResult.data;

        // Verifica che l'email sia unica
        const { data: existing } = await supabase
            .from('Collaboratore')
            .select('id')
            .eq('email', collaboratoreData.email)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: 'Esiste già un collaboratore con questa email' },
                { status: 409 }
            );
        }

        // Crea collaboratore
        const { data: collaboratore, error: createError } = await supabase
            .from('Collaboratore')
            .insert({
                azienda_id: azienda.id,
                ...collaboratoreData,
                attivo: true,
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Se ci sono nuclei, crea le appartenenze
        if (nuclei_ids && nuclei_ids.length > 0) {
            const appartenenze = nuclei_ids.map(nucleoId => ({
                collaboratore_id: collaboratore.id,
                nucleo_id: nucleoId,
                data_inizio: new Date().toISOString().split('T')[0],
            }));

            await supabase.from('Appartenenza_Nucleo').insert(appartenenze);
        }

        return NextResponse.json({ data: collaboratore, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error creating collaboratore:', error);
        return NextResponse.json(
            { error: 'Errore nella creazione del collaboratore' },
            { status: 500 }
        );
    }
}
