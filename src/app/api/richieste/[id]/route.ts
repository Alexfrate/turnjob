import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema per aggiornamento stato richiesta (approvazione/rifiuto)
const UpdateRichiestaSchema = z.object({
    stato: z.enum(['approvata', 'rifiutata', 'cancellata']).optional(),
    note_admin: z.string().optional(),
    motivo_rifiuto: z.string().optional(),
});

// Helper per verificare accesso alla richiesta
async function verificaAccessoRichiesta(supabase: Awaited<ReturnType<typeof createClient>>, richiestaId: string, userEmail: string) {
    // Ottieni azienda dell'utente
    const { data: azienda } = await supabase
        .from('Azienda')
        .select('id')
        .eq('super_admin_email', userEmail)
        .single();

    if (!azienda) {
        return { error: 'Azienda non trovata', status: 404 };
    }

    // Verifica che la richiesta appartenga a un collaboratore dell'azienda
    const { data: richiesta } = await supabase
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
        .eq('id', richiestaId)
        .eq('Collaboratore.azienda_id', azienda.id)
        .single();

    if (!richiesta) {
        return { error: 'Richiesta non trovata', status: 404 };
    }

    return { richiesta, azienda };
}

// GET /api/richieste/[id] - Dettaglio richiesta
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

        const result = await verificaAccessoRichiesta(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({ data: result.richiesta });

    } catch (error) {
        console.error('Error fetching richiesta:', error);
        return NextResponse.json(
            { error: 'Errore nel recupero della richiesta' },
            { status: 500 }
        );
    }
}

// PATCH /api/richieste/[id] - Approva/Rifiuta/Cancella richiesta
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

        const result = await verificaAccessoRichiesta(supabase, id, user.email!);
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
        const validationResult = UpdateRichiestaSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Dati non validi', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const updateData = validationResult.data;

        // Verifica che la richiesta sia in attesa per poterla modificare
        if (updateData.stato && result.richiesta.stato !== 'in_attesa') {
            return NextResponse.json(
                { error: 'Solo le richieste in attesa possono essere modificate' },
                { status: 400 }
            );
        }

        // Se viene rifiutata, è richiesto un motivo
        if (updateData.stato === 'rifiutata' && !updateData.motivo_rifiuto) {
            return NextResponse.json(
                { error: 'Il motivo del rifiuto è obbligatorio' },
                { status: 400 }
            );
        }

        // Prepara dati aggiornamento
        const dataToUpdate: Record<string, unknown> = { ...updateData };

        // Se cambia stato, registra chi e quando
        if (updateData.stato) {
            dataToUpdate.rivista_da = admin?.id || null;
            dataToUpdate.rivista_il = new Date().toISOString();
        }

        dataToUpdate.updated_at = new Date().toISOString();

        // Aggiorna richiesta
        const { data: richiestaAggiornata, error: updateError } = await supabase
            .from('Richiesta')
            .update(dataToUpdate)
            .eq('id', id)
            .select(`
                *,
                Collaboratore (id, nome, cognome, email)
            `)
            .single();

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ data: richiestaAggiornata, success: true });

    } catch (error) {
        console.error('Error updating richiesta:', error);
        return NextResponse.json(
            { error: 'Errore nell\'aggiornamento della richiesta' },
            { status: 500 }
        );
    }
}

// DELETE /api/richieste/[id] - Elimina richiesta (solo se in attesa)
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

        const result = await verificaAccessoRichiesta(supabase, id, user.email!);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Solo richieste in attesa possono essere eliminate
        if (result.richiesta.stato !== 'in_attesa') {
            return NextResponse.json(
                { error: 'Solo le richieste in attesa possono essere eliminate' },
                { status: 400 }
            );
        }

        // Elimina richiesta
        const { error: deleteError } = await supabase
            .from('Richiesta')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true, message: 'Richiesta eliminata' });

    } catch (error) {
        console.error('Error deleting richiesta:', error);
        return NextResponse.json(
            { error: 'Errore nell\'eliminazione della richiesta' },
            { status: 500 }
        );
    }
}
