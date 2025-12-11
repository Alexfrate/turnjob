import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkIsSuperAdmin } from '@/lib/auth/check-super-admin';

/**
 * GET /api/admin/ai-prompts
 * Lista tutti i system prompts - Solo super_admin
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica super_admin
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user.email);
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
    }

    // Carica tutti i prompts
    const { data: prompts, error } = await supabase
      .from('AiSystemPrompt')
      .select('*')
      .order('useCase', { ascending: true });

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dei prompts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompts: prompts || [],
    });
  } catch (error) {
    console.error('Error in AI prompts GET:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-prompts
 * Aggiorna un system prompt - Solo super_admin
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica super_admin
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user.email);
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
    }

    const body = await request.json();
    const { id, promptTemplate, name, description, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID prompt mancante' },
        { status: 400 }
      );
    }

    // Carica prompt esistente per incrementare versione
    const { data: existing } = await supabase
      .from('AiSystemPrompt')
      .select('version')
      .eq('id', id)
      .single();

    const newVersion = (existing?.version || 0) + 1;

    // Aggiorna prompt
    const { data: updated, error } = await supabase
      .from('AiSystemPrompt')
      .update({
        promptTemplate,
        name,
        description,
        isActive,
        version: newVersion,
        updatedBy: user.email,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prompt:', error);
      return NextResponse.json(
        { success: false, error: 'Errore nell\'aggiornamento del prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: updated,
    });
  } catch (error) {
    console.error('Error in AI prompts PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-prompts/reset
 * Ripristina un prompt al valore di default - Solo super_admin
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica super_admin
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user.email);
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
    }

    const body = await request.json();
    const { useCase } = body;

    if (!useCase) {
      return NextResponse.json(
        { success: false, error: 'Use case mancante' },
        { status: 400 }
      );
    }

    // Prompts di default
    const defaultPrompts: Record<string, { name: string; description: string; promptTemplate: string }> = {
      planning_chat: {
        name: 'Chat Pianificazione Turni',
        description: 'System prompt per la chat AI che aiuta nella pianificazione turni',
        promptTemplate: `Sei un assistente specializzato nella pianificazione turni di lavoro.

📅 OGGI È: {{date}}
📆 SETTIMANA SELEZIONATA: {{weekStart}} - {{weekEnd}}
🏢 AZIENDA: {{companyName}}

REGOLE DI COMUNICAZIONE:
- Messaggi BREVI (max 3-4 frasi)
- Una domanda alla volta
- Usa emoji per chiarezza visiva
- Rispondi in italiano

CRITICITÀ DA CONSIDERARE:
Le criticità sono eventi o situazioni che influenzano la pianificazione:
- 📦 Scarichi merce (giorni/orari fissi di consegna)
- 🏖️ Ferie o assenze del personale
- 🔥 Eventi speciali o periodi di alta affluenza
- ⚠️ Vincoli contrattuali o limitazioni

DATI DISPONIBILI:
{{contextData}}

Aiuta l'utente a identificare le criticità della settimana e genera turni ottimali.`,
      },
      onboarding: {
        name: 'Onboarding Conversazionale',
        description: 'System prompt per la chat di onboarding iniziale',
        promptTemplate: `Sei un assistente per il setup iniziale di Turnjob, una piattaforma di gestione turni.

📅 DATA: {{date}}

Il tuo obiettivo è raccogliere le informazioni necessarie per configurare l'azienda:
1. Nome azienda e settore
2. Numero di collaboratori
3. Turni tipici (orari, durata)
4. Regole specifiche (es. riposi, straordinari)

REGOLE:
- Fai una domanda alla volta
- Sii cordiale ma conciso
- Conferma le informazioni raccolte
- Rispondi in italiano

Inizia presentandoti e chiedendo il nome dell'azienda.`,
      },
    };

    const defaultPrompt = defaultPrompts[useCase];
    if (!defaultPrompt) {
      return NextResponse.json(
        { success: false, error: 'Use case non supportato per il reset' },
        { status: 400 }
      );
    }

    // Aggiorna al default
    const { data: updated, error } = await supabase
      .from('AiSystemPrompt')
      .update({
        ...defaultPrompt,
        version: 1,
        updatedBy: user.email,
        updatedAt: new Date().toISOString(),
      })
      .eq('useCase', useCase)
      .select()
      .single();

    if (error) {
      console.error('Error resetting prompt:', error);
      return NextResponse.json(
        { success: false, error: 'Errore nel ripristino del prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: updated,
    });
  } catch (error) {
    console.error('Error in AI prompts POST:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
