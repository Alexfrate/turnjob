import { createClient } from '@/lib/supabase/server';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';
import { NextRequest, NextResponse } from 'next/server';
import type { OrarioApertura } from '@/types/database';

// GET - Ottieni orario_apertura attuale
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

        if (aziendaError || !azienda) {
            return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
        }

        return NextResponse.json({
            data: azienda.orario_apertura,
            aziendaId: azienda.id,
            aziendaNome: azienda.nome
        });
    } catch (error) {
        console.error('Error fetching orario:', error);
        return NextResponse.json({ error: 'Errore nel recupero dati' }, { status: 500 });
    }
}

// PATCH - Aggiorna orario_apertura
export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

        if (aziendaError || !azienda) {
            return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
        }

        const body = await req.json();
        const orarioApertura: OrarioApertura = body.orarioApertura;

        if (!orarioApertura || !orarioApertura.tipo) {
            return NextResponse.json({ error: 'orarioApertura non valido' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('Azienda')
            .update({
                orario_apertura: orarioApertura,
                tipo_orario: orarioApertura.tipo
            })
            .eq('id', azienda.id)
            .select('orario_apertura')
            .single();

        if (error) {
            console.error('Error updating orario:', error);
            return NextResponse.json({ error: 'Errore nell\'aggiornamento' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data.orario_apertura });
    } catch (error) {
        console.error('Error updating orario:', error);
        return NextResponse.json({ error: 'Errore nell\'aggiornamento' }, { status: 500 });
    }
}
