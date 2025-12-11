import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// Schema per aggiornamento turno
const UpdateTurnoSchema = z.object({
    nucleo_id: z.string().uuid().optional(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ora_inizio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    ora_fine: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    num_collaboratori_richiesti: z.number().int().min(1).optional(),
    note: z.string().nullable().optional(),
    pubblicato: z.boolean().optional(),
    completato: z.boolean().optional(),
});

// Helper per verificare accesso al turno
async function verificaAccessoTurno(supabase: Awaited<ReturnType<typeof createClient>>, turnoId: string, userEmail: string) {
    // Ottieni azienda dell'utente
    const { azienda, error: aziendaError } = await getUserAzienda(supabase, userEmail);

    if (!azienda || aziendaError) {
        return { error: aziendaError || 'Azienda non trovata', status: 404 };
    }

    // Verifica che il turno appartenga a un nucleo dell'azienda
    const { data: turno } = await supabase
        .from('Turno')
        .select(`
            *,
            Nucleo!inner (
                id,
                nome,
                colore,
                mansione,
                azienda_id
            )
        `)
        .eq('id', turnoId)
        .eq('Nucleo.azienda_id', azienda.id)
        .single();

    if (!turno) {
        return { error: 'Turno non trovato', status: 404 };
    }

    return { turno, azienda };
}

// GET /api/turni/[id] - Dettaglio turno
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Ottieni turno con tutte le relazioni
        const { data: turno, error } = await supabase
            .from('Turno')
            .select(`
                *,
                Nucleo (
                    id,
                    nome,
                    colore,
                    mansione
                ),
                Assegnazione_Turno (
                    id,
                    collaboratore_id,
                    tipo,
                    confermato,
                    confermato_il,
                    ore_lavorate,
                    Collaboratore (
                        id,
                        nome,
                        cognome,
                        email,
                        telefono
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: turno });

    } catch (error) {
        console.error('Error fetching turno:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero del turno' },
            { status: 500 }
        );
    }
}

// PATCH /api/turni/[id] - Aggiorna turno
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Ottieni admin
        const { data: admin } = await supabase
            .from('Amministratore')
            .select('id')
            .eq('email', user.email)
            .eq('azienda_id', result.azienda.id)
            .single();

        // Valida dati
        const body = await req.json();
        const validationResult = UpdateTurnoSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const updateData = validationResult.data;

        // Se cambio nucleo, verifica appartenenza
        if (updateData.nucleo_id) {
            const { data: nucleo } = await supabase
                .from('Nucleo')
                .select('id')
                .eq('id', updateData.nucleo_id)
                .eq('azienda_id', result.azienda.id)
                .single();

            if (!nucleo) {
                return NextResponse.json(
                    { error: 'Nucleo non trovato' },
                    { status: 404 }
                );
            }
        }

        // Validazione orari se presenti
        const oraInizio = updateData.ora_inizio || result.turno.ora_inizio;
        const oraFine = updateData.ora_fine || result.turno.ora_fine;
        if (oraInizio >= oraFine) {
            return NextResponse.json(
                { error: 'L\'ora di inizio deve essere precedente all\'ora di fine' },
                { status: 400 }
            );
        }

        // Aggiorna turno
        const { data: turnoAggiornato, error: updateError } = await supabase
            .from('Turno')
            .update({
                ...updateData,
                modificato_da: admin?.id || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
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
            .single();

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ data: turnoAggiornato, success: true });

    } catch (error) {
        console.error('Error updating turno:', error);
        return NextResponse.json(
            { error: 'Errore nell\'aggiornamento del turno' },
            { status: 500 }
        );
    }
}

// DELETE /api/turni/[id] - Elimina turno
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const result = await verificaAccessoTurno(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Non permettere eliminazione di turni pubblicati
        if (result.turno.pubblicato) {
            return NextResponse.json(
                { error: 'Non puoi eliminare un turno già pubblicato. Annulla prima la pubblicazione.' },
                { status: 400 }
            );
        }

        // Elimina assegnazioni (cascade dovrebbe farlo automaticamente, ma per sicurezza)
        await supabase
            .from('Assegnazione_Turno')
            .delete()
            .eq('turno_id', id);

        // Elimina turno
        const { error: deleteError } = await supabase
            .from('Turno')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true, message: 'Turno eliminato' });

    } catch (error) {
        console.error('Error deleting turno:', error);
        return NextResponse.json(
            { error: 'Errore nell\'eliminazione del turno' },
            { status: 500 }
        );
    }
}
