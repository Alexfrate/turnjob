import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema validazione per creazione richiesta
const CreateRichiestaSchema = z.object({
    collaboratore_id: z.string().uuid('ID collaboratore non valido'),
    tipo: z.enum(['ferie', 'permesso', 'riposo']),
    data_inizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (YYYY-MM-DD)'),
    data_fine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (YYYY-MM-DD)'),
    ore_richieste: z.number().int().min(1).optional(),
    note_collaboratore: z.string().optional(),
});

// Query params per filtri
const FilterSchema = z.object({
    stato: z.enum(['in_attesa', 'approvata', 'rifiutata', 'cancellata']).optional(),
    tipo: z.enum(['ferie', 'permesso', 'riposo']).optional(),
    collaboratore_id: z.string().uuid().optional(),
    data_inizio: z.string().optional(),
    data_fine: z.string().optional(),
});

// GET /api/richieste - Lista richieste con filtri
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        // Ottieni azienda dell'utente
        const { data: azienda, error: aziendaError } = await supabase
            .from('Azienda')
            .select('id')
            .eq('super_admin_email', user.email)
            .single();

        if (aziendaError || !azienda) {
            return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
        }

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const filters = FilterSchema.safeParse({
            stato: searchParams.get('stato'),
            tipo: searchParams.get('tipo'),
            collaboratore_id: searchParams.get('collaboratore_id'),
            data_inizio: searchParams.get('data_inizio'),
            data_fine: searchParams.get('data_fine'),
        });

        // Query base - richieste dei collaboratori dell'azienda
        let query = supabase
            .from('Richiesta')
            .select(`
                *,
                Collaboratore!inner (
                    id,
                    nome,
                    cognome,
                    email,
                    azienda_id
                )
            `)
            .eq('Collaboratore.azienda_id', azienda.id)
            .order('created_at', { ascending: false });

        // Applica filtri
        if (filters.success) {
            const { stato, tipo, collaboratore_id, data_inizio, data_fine } = filters.data;

            if (stato) {
                query = query.eq('stato', stato);
            }
            if (tipo) {
                query = query.eq('tipo', tipo);
            }
            if (collaboratore_id) {
                query = query.eq('collaboratore_id', collaboratore_id);
            }
            if (data_inizio) {
                query = query.gte('data_inizio', data_inizio);
            }
            if (data_fine) {
                query = query.lte('data_fine', data_fine);
            }
        }

        const { data: richieste, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: richieste ?? [] });

    } catch (error) {
        console.error('Error fetching richieste:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero delle richieste' },
            { status: 500 }
        );
    }
}

// POST /api/richieste - Crea nuova richiesta
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
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

        // Valida dati in input
        const body = await req.json();
        const validationResult = CreateRichiestaSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const richiestaData = validationResult.data;

        // Verifica che il collaboratore appartenga all'azienda
        const { data: collaboratore } = await supabase
            .from('Collaboratore')
            .select('id, nome, cognome')
            .eq('id', richiestaData.collaboratore_id)
            .eq('azienda_id', azienda.id)
            .eq('attivo', true)
            .single();

        if (!collaboratore) {
            return NextResponse.json(
                { error: 'Collaboratore non trovato o non attivo' },
                { status: 404 }
            );
        }

        // Validazione date
        if (richiestaData.data_inizio > richiestaData.data_fine) {
            return NextResponse.json(
                { error: 'La data di inizio deve essere precedente o uguale alla data di fine' },
                { status: 400 }
            );
        }

        // Verifica che non ci siano richieste sovrapposte per lo stesso collaboratore
        const { data: richiesteEsistenti } = await supabase
            .from('Richiesta')
            .select('id, data_inizio, data_fine, stato')
            .eq('collaboratore_id', richiestaData.collaboratore_id)
            .in('stato', ['in_attesa', 'approvata'])
            .or(`data_inizio.lte.${richiestaData.data_fine},data_fine.gte.${richiestaData.data_inizio}`);

        if (richiesteEsistenti && richiesteEsistenti.length > 0) {
            // Verifica sovrapposizione effettiva
            for (const re of richiesteEsistenti) {
                if (richiestaData.data_inizio <= re.data_fine && re.data_inizio <= richiestaData.data_fine) {
                    return NextResponse.json(
                        {
                            error: `Esiste già una richiesta ${re.stato} dal ${re.data_inizio} al ${re.data_fine}`
                        },
                        { status: 409 }
                    );
                }
            }
        }

        // Crea richiesta
        const { data: richiesta, error: createError } = await supabase
            .from('Richiesta')
            .insert({
                ...richiestaData,
                stato: 'in_attesa',
            })
            .select(`
                *,
                Collaboratore (id, nome, cognome, email)
            `)
            .single();

        if (createError) {
            throw createError;
        }

        return NextResponse.json({ data: richiesta, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error creating richiesta:', error);
        return NextResponse.json(
            { error: 'Errore nella creazione della richiesta' },
            { status: 500 }
        );
    }
}
