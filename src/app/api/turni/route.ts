import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Schema validazione per creazione turno
const CreateTurnoSchema = z.object({
    nucleo_id: z.string().uuid('ID nucleo non valido'),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (YYYY-MM-DD)'),
    ora_inizio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato ora non valido (HH:MM)'),
    ora_fine: z.string().regex(/^\d{2}:\d{2}$/, 'Formato ora non valido (HH:MM)'),
    num_collaboratori_richiesti: z.number().int().min(1).default(1),
    note: z.string().optional(),
    pubblicato: z.boolean().default(false),
    // Campi AI
    suggerito_da_ai: z.boolean().default(false),
    ai_confidence: z.number().min(0).max(1).optional(),
    // Assegnazioni opzionali da creare insieme al turno
    assegnazioni: z.array(z.object({
        collaboratore_id: z.string().uuid(),
        tipo: z.enum(['manuale', 'richiesta_collaboratore', 'suggerita_ai']).default('manuale'),
    })).optional(),
});

// Query params per filtri
const FilterSchema = z.object({
    data_inizio: z.string().optional(),
    data_fine: z.string().optional(),
    nucleo_id: z.string().uuid().optional(),
    pubblicato: z.enum(['true', 'false']).optional(),
});

// GET /api/turni - Lista turni con filtri
export async function GET(req: NextRequest) {
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

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const filters = FilterSchema.safeParse({
            data_inizio: searchParams.get('data_inizio'),
            data_fine: searchParams.get('data_fine'),
            nucleo_id: searchParams.get('nucleo_id'),
            pubblicato: searchParams.get('pubblicato'),
        });

        // Query base - turni dei nuclei dell'azienda
        let query = supabase
            .from('Turno')
            .select(`
                *,
                Nucleo!inner (
                    id,
                    nome,
                    colore,
                    mansione,
                    azienda_id
                ),
                Assegnazione_Turno (
                    id,
                    collaboratore_id,
                    tipo,
                    confermato,
                    ore_lavorate,
                    Collaboratore (
                        id,
                        nome,
                        cognome,
                        email
                    )
                )
            `)
            .eq('Nucleo.azienda_id', azienda.id)
            .order('data', { ascending: true })
            .order('ora_inizio', { ascending: true });

        // Applica filtri
        if (filters.success) {
            const { data_inizio, data_fine, nucleo_id, pubblicato } = filters.data;

            if (data_inizio) {
                query = query.gte('data', data_inizio);
            }
            if (data_fine) {
                query = query.lte('data', data_fine);
            }
            if (nucleo_id) {
                query = query.eq('nucleo_id', nucleo_id);
            }
            if (pubblicato !== undefined) {
                query = query.eq('pubblicato', pubblicato === 'true');
            }
        }

        const { data: turni, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: turni ?? [] });

    } catch (error) {
        console.error('Error fetching turni:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero dei turni' },
            { status: 500 }
        );
    }
}

// POST /api/turni - Crea nuovo turno
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Ottieni azienda e admin
        const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

        if (!azienda || aziendaError) {
            return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
        }

        const { data: admin } = await supabase
            .from('Amministratore')
            .select('id')
            .eq('email', user.email)
            .eq('azienda_id', azienda.id)
            .single();

        // Valida dati in input
        const body = await req.json();
        const validationResult = CreateTurnoSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { assegnazioni, ...turnoData } = validationResult.data;

        // Verifica che il nucleo appartenga all'azienda
        const { data: nucleo } = await supabase
            .from('Nucleo')
            .select('id, azienda_id')
            .eq('id', turnoData.nucleo_id)
            .eq('azienda_id', azienda.id)
            .single();

        if (!nucleo) {
            return NextResponse.json(
                { error: 'Nucleo non trovato o non appartiene all\'azienda' },
                { status: 404 }
            );
        }

        // Validazione orari
        if (turnoData.ora_inizio >= turnoData.ora_fine) {
            return NextResponse.json(
                { error: 'L\'ora di inizio deve essere precedente all\'ora di fine' },
                { status: 400 }
            );
        }

        // Crea turno
        const { data: turno, error: createError } = await supabase
            .from('Turno')
            .insert({
                ...turnoData,
                creato_da: admin?.id || null,
                completato: false,
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Se ci sono assegnazioni, creale
        if (assegnazioni && assegnazioni.length > 0) {
            const assegnazioniData = assegnazioni.map(a => ({
                turno_id: turno.id,
                collaboratore_id: a.collaboratore_id,
                tipo: a.tipo,
                confermato: false,
            }));

            const { error: assError } = await supabase
                .from('Assegnazione_Turno')
                .insert(assegnazioniData);

            if (assError) {
                console.error('Error creating assegnazioni:', assError);
            }
        }

        // Ritorna turno con relazioni
        const { data: turnoCompleto } = await supabase
            .from('Turno')
            .select(`
                *,
                Nucleo (id, nome, colore, mansione),
                Assegnazione_Turno (
                    id,
                    collaboratore_id,
                    tipo,
                    confermato,
                    Collaboratore (id, nome, cognome)
                )
            `)
            .eq('id', turno.id)
            .single();

        return NextResponse.json({ data: turnoCompleto, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error creating turno:', error);
        return NextResponse.json(
            { error: 'Errore nella creazione del turno' },
            { status: 500 }
        );
    }
}
