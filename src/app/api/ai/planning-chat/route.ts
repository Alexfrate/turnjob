/**
 * API AI Planning Chat
 *
 * POST /api/ai/planning-chat - Chat AI per pianificazione turni
 *
 * L'AI distingue tra:
 * - CONTINUATIVE: Pattern ricorrenti settimanali (salvati nel DB)
 * - SPORADICHE: Eventi una tantum per la settimana specifica
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';

// System prompt è costruito dinamicamente per includere data corrente
function buildSystemPrompt(currentDate: string, weekStart: string, weekEnd: string): string {
  return `Sei l'assistente AI di Turnjob per la pianificazione turni.

📅 OGGI È: ${currentDate}
📆 SETTIMANA: ${weekStart} - ${weekEnd}

## REGOLE COMUNICAZIONE (IMPORTANTE!)
- Messaggi BREVI: max 2-3 frasi per risposta
- Una domanda alla volta
- Usa emoji per chiarezza
- NO lunghe introduzioni

## PRIMO MESSAGGIO
Inizia con:
"Ciao! Pianifichiamo la settimana ${weekStart}-${weekEnd}.

Dimmi le **criticità** da considerare:
• 📦 Scarichi merce
• 🏖️ Ferie/assenze
• 🔥 Eventi speciali

Qual è la prima?"

## CRITICITÀ
- 🔄 **CONTINUATIVE**: Pattern settimanali ricorrenti (es. "ogni giovedì scarico")
- ⚡ **SPORADICHE**: Eventi solo questa settimana (es. "Marco in ferie lunedì")

Quando rilevi una criticità:
"✅ [🔄/⚡] ${'{tipo}'}: ${'{descrizione}'}
Altra criticità?"

## CATEGORIE
SCARICO_MERCI, ALTA_AFFLUENZA, PICCO_WEEKEND, COPERTURA_MINIMA, EVENTO_SPECIALE, EVENTO_CRITICO, ASSENZA_FERIE, ASSENZA_MALATTIA, LIMITAZIONE_TEMP, FORMAZIONE, MANUTENZIONE, ALTRO

## OUTPUT JSON (alla fine del messaggio)
\`\`\`criticita
{
  "tipo": "CATEGORIA",
  "nome": "Nome",
  "descrizione": "Descrizione",
  "giorno_settimana": 1-7,
  "ora_inizio": "HH:MM",
  "ora_fine": "HH:MM",
  "is_continuativa": true/false,
  "staff_extra": 0,
  "confidenza": 0.9
}
\`\`\``;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Ottieni azienda
    const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

    if (!azienda || aziendaError) {
      return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
    }

    const { messages, weekStart, weekEnd } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messaggi non validi' }, { status: 400 });
    }

    // Genera data corrente formattata
    const oggi = new Date();
    const currentDate = oggi.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Carica contesto: criticità continuative, collaboratori, ferie, config LLM
    const [criticitaRes, collaboratoriRes, periodiCriticiRes, llmConfigRes] = await Promise.all([
      supabase
        .from('CriticitaContinuativa')
        .select('*')
        .eq('azienda_id', azienda.id)
        .eq('attivo', true)
        .order('giorno_settimana'),
      supabase
        .from('Collaboratore')
        .select('id, nome, cognome, ruolo, tipo_contratto, ore_settimanali')
        .eq('azienda_id', azienda.id)
        .eq('attivo', true),
      weekStart && weekEnd
        ? supabase
            .from('PeriodoCritico')
            .select('*')
            .eq('azienda_id', azienda.id)
            .eq('attivo', true)
            .gte('data_fine', weekStart)
            .lte('data_inizio', weekEnd)
        : Promise.resolve({ data: [] }),
      // Carica config LLM globale (planningChatModelId)
      supabase
        .from('LlmConfiguration')
        .select('planningChatModelId')
        .is('companyId', null)
        .limit(1),
    ]);

    const criticita = criticitaRes.data || [];
    const collaboratori = collaboratoriRes.data || [];
    const periodiCritici = periodiCriticiRes.data || [];

    // Modello dinamico dalla config globale o fallback
    const configuredModel = llmConfigRes.data?.[0]?.planningChatModelId;
    const model = configuredModel || 'x-ai/grok-4.1-fast';

    // Costruisci contesto per l'AI
    const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    const criticitaContext = criticita.length > 0
      ? `## CRITICITÀ CONTINUATIVE SALVATE\n${criticita
          .map((c) => `- 🔄 ${c.nome} (${c.tipo}): ${giorni[c.giorno_settimana]}${c.ora_inizio ? ` ${c.ora_inizio}-${c.ora_fine || ''}` : ''}`)
          .join('\n')}`
      : '## CRITICITÀ CONTINUATIVE\nNessuna criticità continuativa salvata.';

    const collaboratoriContext = collaboratori.length > 0
      ? `## COLLABORATORI DISPONIBILI (${collaboratori.length})\n${collaboratori
          .map((c) => `- ${c.nome} ${c.cognome} (${c.ruolo || 'N/D'}) - ${c.ore_settimanali || 40}h/sett`)
          .join('\n')}`
      : '## COLLABORATORI\nNessun collaboratore registrato.';

    const periodiContext = periodiCritici.length > 0
      ? `## PERIODI CRITICI/FERIE QUESTA SETTIMANA\n${periodiCritici
          .map((p) => `- ⚡ ${p.nome}: ${p.data_inizio} - ${p.data_fine}`)
          .join('\n')}`
      : '';

    // Costruisci system prompt con data corrente
    const systemPrompt = buildSystemPrompt(
      currentDate,
      weekStart || 'non specificato',
      weekEnd || 'non specificato'
    );

    const contextMessage = {
      role: 'system',
      content: `${systemPrompt}\n\n---\n\n# CONTESTO AZIENDA: ${azienda.nome}\n\n${criticitaContext}\n\n${collaboratoriContext}\n\n${periodiContext}`,
    };

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Chiamata OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Turnjob Planning',
      },
      body: JSON.stringify({
        model: model, // Modello dinamico dalla config
        messages: [contextMessage, ...messages],
        max_tokens: 1000, // Ridotto per risposte più brevi
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter error:', errorData);
      return NextResponse.json(
        { error: 'Errore nella comunicazione con il modello AI', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage =
      data.choices?.[0]?.message?.content ||
      'Mi dispiace, non ho ricevuto una risposta. Riprova.';

    // Estrai eventuali criticità dal messaggio
    const criticataMatch = assistantMessage.match(/```criticita\n([\s\S]*?)```/);
    let extractedCriticita = null;

    if (criticataMatch) {
      try {
        extractedCriticita = JSON.parse(criticataMatch[1]);
      } catch {
        console.warn('Failed to parse criticità JSON');
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      content: assistantMessage,
      extractedCriticita,
      model: model, // Modello usato per la risposta
      context: {
        criticitaContinuative: criticita.length,
        collaboratori: collaboratori.length,
        periodiCritici: periodiCritici.length,
        currentDate: currentDate,
      },
    });
  } catch (error) {
    console.error('Error in planning chat:', error);
    return NextResponse.json(
      {
        error: 'Errore durante la generazione della risposta',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
