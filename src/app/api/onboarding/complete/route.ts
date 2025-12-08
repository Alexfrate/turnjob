import { createClient } from '@/lib/supabase/server';
import { OnboardingDataSchema, type OnboardingData } from '@/lib/schemas/onboarding';
import { NextRequest, NextResponse } from 'next/server';
import { COLORI_DEFAULT } from '@/lib/schemas/onboarding';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verifica autenticazione
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Non autenticato' },
                { status: 401 }
            );
        }

        // Valida i dati
        const body = await req.json();
        const forceNewCompany = body.forceNewCompany === true;
        const validationResult = OnboardingDataSchema.safeParse(body.data);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Dati non validi',
                    details: validationResult.error.errors
                },
                { status: 400 }
            );
        }

        const data: OnboardingData = validationResult.data;

        let aziendaId: string;
        let existingAzienda = null;

        // Solo se NON stiamo forzando una nuova azienda, cerchiamo quella esistente
        if (!forceNewCompany) {
            const { data: found } = await supabase
                .from('Azienda')
                .select('id')
                .eq('super_admin_email', user.email)
                .limit(1)
                .single();
            existingAzienda = found;
        }

        if (existingAzienda && !forceNewCompany) {
            // Aggiorna azienda esistente
            const { data: updatedAzienda, error: updateError } = await supabase
                .from('Azienda')
                .update({
                    nome: data.nomeAzienda,
                    tipo_attivita: data.tipoAttivita,
                    tipo_orario: data.orarioApertura.tipo,
                    orario_apertura: data.orarioApertura,
                    completato_onboarding: true
                })
                .eq('id', existingAzienda.id)
                .select('id')
                .single();

            if (updateError) {
                console.error('Error updating azienda:', updateError);
                throw new Error('Errore durante l\'aggiornamento dell\'azienda');
            }

            aziendaId = updatedAzienda!.id;
        } else {
            // Crea nuova azienda
            const { data: newAzienda, error: insertError } = await supabase
                .from('Azienda')
                .insert({
                    nome: data.nomeAzienda,
                    tipo_attivita: data.tipoAttivita,
                    tipo_orario: data.orarioApertura.tipo,
                    orario_apertura: data.orarioApertura,
                    super_admin_email: user.email,
                    completato_onboarding: true
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('Error creating azienda:', insertError);
                throw new Error('Errore durante la creazione dell\'azienda');
            }

            aziendaId = newAzienda!.id;

            // Crea amministratore super_admin
            const { error: adminError } = await supabase
                .from('Amministratore')
                .insert({
                    azienda_id: aziendaId,
                    email: user.email,
                    nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
                    ruolo: 'super_admin',
                    puo_modificare_orari: true,
                    puo_modificare_collaboratori: true,
                    puo_modificare_turni: true,
                    puo_gestire_ferie: true,
                    puo_gestire_permessi: true,
                    puo_modificare_nuclei: true
                });

            if (adminError) {
                console.error('Error creating admin:', adminError);
                // Non blocchiamo se l'admin esiste già
            }
        }

        // Elimina nuclei esistenti e ricreali
        await supabase
            .from('Nucleo')
            .delete()
            .eq('azienda_id', aziendaId);

        // Crea nuclei
        const nucleiToInsert = data.nuclei.map((nucleo, index) => ({
            azienda_id: aziendaId,
            nome: nucleo.nome,
            mansione: nucleo.mansione,
            colore: nucleo.colore || COLORI_DEFAULT[index % COLORI_DEFAULT.length],
            descrizione: nucleo.descrizione || null
        }));

        const { error: nucleiError } = await supabase
            .from('Nucleo')
            .insert(nucleiToInsert);

        if (nucleiError) {
            console.error('Error creating nuclei:', nucleiError);
            // Non blocchiamo l'operazione
        }

        return NextResponse.json({
            success: true,
            aziendaId,
            message: 'Onboarding completato con successo!',
            redirect: '/dashboard'
        });

    } catch (error) {
        console.error('Error completing onboarding:', error);
        return NextResponse.json(
            {
                error: 'Errore durante il completamento dell\'onboarding',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
