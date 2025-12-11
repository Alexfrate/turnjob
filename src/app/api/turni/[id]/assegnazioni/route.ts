import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Schema per creazione assegnazione
const CreateAssegnazioneSchema = z.object({
    collaboratore_id: z.string().uuid('ID collaboratore non valido'),
    tipo: z.enum(['manuale', 'richiesta_collaboratore', 'suggerita_ai']).default('manuale'),
});

// Schema per aggiornamento assegnazione
const UpdateAssegnazioneSchema = z.object({
    confermato: z.boolean().optional(),
    ore_lavorate: z.number().min(0).optional(),
});

// Helper per verificare accesso al turno
async function verificaAccessoTurno(supabase: Awaited<ReturnType<typeof createClient>>, turnoId: string, userEmail: string) {
    const { azienda, error: aziendaError } = await getUserAzienda(supabase, userEmail);

    if (!azienda || aziendaError) {
        return { error: aziendaError || 'Azienda non trovata', status: 404 };
    }

    const { data: turno } = await supabase
        .from('Turno')
        .select(`
            *,
            Nucleo!inner (id, azienda_id)
        `)
        .eq('id', turnoId)
        .eq('Nucleo.azienda_id', azienda.id)
        .single();

    if (!turno) {
        return { error: 'Turno non trovato', status: 404 };
    }

    return { turno, azienda };
}

// GET /api/turni/[id]/assegnazioni - Lista assegnazioni del turno
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { data: assegnazioni, error } = await supabase
            .from('Assegnazione_Turno')
            .select(`
                *,
                Collaboratore (
                    id,
                    nome,
                    cognome,
                    email,
                    telefono
                )
            `)
            .eq('turno_id', id)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: assegnazioni ?? [] });

    } catch (error) {
        console.error('Error fetching assegnazioni:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero delle assegnazioni' },
            { status: 500 }
        );
    }
}

// POST /api/turni/[id]/assegnazioni - Aggiungi collaboratore al turno
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Valida dati
        const body = await req.json();
        const validationResult = CreateAssegnazioneSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { collaboratore_id, tipo } = validationResult.data;

        // Verifica che il collaboratore appartenga all'azienda
        const { data: collaboratore } = await supabase
            .from('Collaboratore')
            .select('id, nome, cognome')
            .eq('id', collaboratore_id)
            .eq('azienda_id', result.azienda.id)
            .eq('attivo', true)
            .single();

        if (!collaboratore) {
            return NextResponse.json(
                { error: 'Collaboratore non trovato o non attivo' },
                { status: 404 }
            );
        }

        // Verifica che il collaboratore non sia già assegnato a questo turno
        const { data: esistente } = await supabase
            .from('Assegnazione_Turno')
            .select('id')
            .eq('turno_id', id)
            .eq('collaboratore_id', collaboratore_id)
            .single();

        if (esistente) {
            return NextResponse.json(
                { error: 'Il collaboratore è già assegnato a questo turno' },
                { status: 409 }
            );
        }

        // Verifica conflitti: il collaboratore non deve avere altri turni nello stesso giorno/orario
        const { data: turniConflitto } = await supabase
            .from('Assegnazione_Turno')
            .select(`
                id,
                Turno!inner (
                    id,
                    data,
                    ora_inizio,
                    ora_fine
                )
            `)
            .eq('collaboratore_id', collaboratore_id)
            .eq('Turno.data', result.turno.data);

        if (turniConflitto && turniConflitto.length > 0) {
            // Verifica sovrapposizione orari
            for (const tc of turniConflitto) {
                const turnoEsistente = tc.Turno as unknown as { ora_inizio: string; ora_fine: string };
                if (!turnoEsistente) continue;

                const nuovoInizio = result.turno.ora_inizio;
                const nuovoFine = result.turno.ora_fine;

                // Sovrapposizione: (start1 < end2) AND (start2 < end1)
                if (nuovoInizio < turnoEsistente.ora_fine && turnoEsistente.ora_inizio < nuovoFine) {
                    return NextResponse.json(
                        {
                            error: `Conflitto: ${collaboratore.nome} ${collaboratore.cognome} ha già un turno dalle ${turnoEsistente.ora_inizio} alle ${turnoEsistente.ora_fine}`
                        },
                        { status: 409 }
                    );
                }
            }
        }

        // Crea assegnazione
        const { data: assegnazione, error: createError } = await supabase
            .from('Assegnazione_Turno')
            .insert({
                turno_id: id,
                collaboratore_id,
                tipo,
                confermato: false,
            })
            .select(`
                *,
                Collaboratore (id, nome, cognome, email)
            `)
            .single();

        if (createError) {
            throw createError;
        }

        return NextResponse.json({ data: assegnazione, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error creating assegnazione:', error);
        return NextResponse.json(
            { error: 'Errore nella creazione dell\'assegnazione' },
            { status: 500 }
        );
    }
}

// DELETE /api/turni/[id]/assegnazioni - Rimuovi assegnazione (body: { assegnazione_id })
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const body = await req.json();
        const { assegnazione_id } = body;

        if (!assegnazione_id) {
            return NextResponse.json(
                { error: 'ID assegnazione richiesto' },
                { status: 400 }
            );
        }

        // Verifica che l'assegnazione appartenga a questo turno
        const { data: assegnazione } = await supabase
            .from('Assegnazione_Turno')
            .select('id')
            .eq('id', assegnazione_id)
            .eq('turno_id', id)
            .single();

        if (!assegnazione) {
            return NextResponse.json(
                { error: 'Assegnazione non trovata' },
                { status: 404 }
            );
        }

        // Elimina assegnazione
        const { error: deleteError } = await supabase
            .from('Assegnazione_Turno')
            .delete()
            .eq('id', assegnazione_id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true, message: 'Assegnazione rimossa' });

    } catch (error) {
        console.error('Error deleting assegnazione:', error);
        return NextResponse.json(
            { error: 'Errore nella rimozione dell\'assegnazione' },
            { status: 500 }
        );
    }
}

// PATCH /api/turni/[id]/assegnazioni - Aggiorna assegnazione (conferma, ore lavorate)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Ottieni admin per registrare chi ha confermato
        const { data: admin } = await supabase
            .from('Amministratore')
            .select('id')
            .eq('email', user.email)
            .eq('azienda_id', result.azienda.id)
            .single();

        const body = await req.json();
        const { assegnazione_id, ...updateFields } = body;

        if (!assegnazione_id) {
            return NextResponse.json(
                { error: 'ID assegnazione richiesto' },
                { status: 400 }
            );
        }

        const validationResult = UpdateAssegnazioneSchema.safeParse(updateFields);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        // Prepara dati aggiornamento
        const updateData: Record<string, unknown> = { ...validationResult.data };

        // Se confermato, aggiungi timestamp e chi ha confermato
        if (validationResult.data.confermato === true) {
            updateData.confermato_il = new Date().toISOString();
            updateData.confermato_da = admin?.id || null;
        }

        // Aggiorna assegnazione
        const { data: assegnazione, error: updateError } = await supabase
            .from('Assegnazione_Turno')
            .update(updateData)
            .eq('id', assegnazione_id)
            .eq('turno_id', id)
            .select(`
                *,
                Collaboratore (id, nome, cognome)
            `)
            .single();

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ data: assegnazione, success: true });

    } catch (error) {
        console.error('Error updating assegnazione:', error);
        return NextResponse.json(
            { error: 'Errore nell\'aggiornamento dell\'assegnazione' },
            { status: 500 }
        );
    }
}
