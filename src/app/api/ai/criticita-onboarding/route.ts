/**
 * API AI Criticità Onboarding
 *
 * POST /api/ai/criticita-onboarding - Chat AI per setup iniziale criticità
 *
 * Guida l'utente attraverso 5 step per configurare le criticità continuative:
 * 1. Giorni critici
 * 2. Orari di picco
 * 3. Eventi ricorrenti (scarichi, consegne)
 * 4. Assenze/ferie
 * 5. Conferma e riepilogo
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';
import {
  getClosedDays,
  formatClosedDaysForAI,
  getDayName
} from '@/lib/utils/closed-days';
import type { OrarioApertura } from '@/types/database';

// Step del wizard
const STEPS = [
  'giorni', // 0: Giorni critici
  'orari', // 1: Orari di picco
  'eventi', // 2: Eventi ricorrenti
  'assenze', // 3: Ferie/assenze
  'conferma', // 4: Conferma
];

function buildSystemPrompt(currentStep: number, orarioApertura?: OrarioApertura): string {
  // Ottieni i giorni di chiusura
  const closedDays = getClosedDays(orarioApertura);
  const closedDaysText = formatClosedDaysForAI(closedDays);
  const excludedDaysWarning = closedDays.length > 0
    ? `\n\n**ATTENZIONE - GIORNI ESCLUSI**: ${closedDays.map(d => getDayName(d)).join(', ')} sono giorni di CHIUSURA aziendale. NON proporre MAI criticità per questi giorni!`
    : '';

  return `Sei l'assistente AI di Turnjob per la configurazione delle criticità.

## RUOLO
Guidi l'utente nella configurazione delle criticità continuative settimanali.
Fai UNA domanda alla volta, aspetta la risposta, estrai le criticità e vai avanti.

## STEP CORRENTE: ${STEPS[currentStep] || 'conferma'} (${currentStep + 1}/5)

## GIORNI DI CHIUSURA AZIENDA
${closedDaysText}
${excludedDaysWarning}

## STEP DEL WIZARD
0. **GIORNI CRITICI**: Chiedi quali giorni della settimana sono più impegnativi (ESCLUDI i giorni di chiusura!)
1. **ORARI PICCO**: Chiedi in quali fasce orarie serve più personale
2. **EVENTI RICORRENTI**: Chiedi di eventi settimanali fissi (scarichi, consegne, riunioni)
3. **ASSENZE**: Chiedi se ci sono pattern di assenze ricorrenti
4. **CONFERMA**: Riepilogo e conferma

## REGOLE
- Risposte BREVI (max 3 frasi)
- UNA domanda alla volta
- Estrai TUTTI i dettagli menzionati
- Scrivi in modo chiaro e conciso senza emoji
- Se l'utente dice "nessuno", "niente", "no" → vai al prossimo step
- **MAI proporre criticità per giorni di chiusura aziendale**

## GIORNI SETTIMANA (ESCLUDI QUELLI CHIUSI!)
1=Lunedì, 2=Martedì, 3=Mercoledì, 4=Giovedì, 5=Venerdì, 6=Sabato, 7=Domenica
${closedDays.length > 0 ? `GIORNI NON VALIDI: ${closedDays.join(', ')} (chiusura aziendale)` : ''}

## CATEGORIE CRITICITÀ
SCARICO_MERCI, ALTA_AFFLUENZA, PICCO_WEEKEND, COPERTURA_MINIMA, EVENTO_SPECIALE, ASSENZA_FERIE, FORMAZIONE, MANUTENZIONE, ALTRO

## OUTPUT JSON (emetti un blocco per OGNI criticità rilevata)
\`\`\`criticita
{
  "tipo": "CATEGORIA",
  "nome": "Nome breve",
  "descrizione": "Descrizione",
  "giorno_settimana": 1-7,
  "ora_inizio": "HH:MM",
  "ora_fine": "HH:MM",
  "staff_extra": 0
}
\`\`\`

## STEP 0 - GIORNI CRITICI
Chiedi: "Quali giorni della settimana sono più critici/impegnativi?"
Esempi da estrarre:
- "Sabato è pieno" → PICCO_WEEKEND, giorno 6
- "Weekend caotico" → PICCO_WEEKEND per sabato E domenica (2 blocchi)
- "Venerdì sera" → ALTA_AFFLUENZA, giorno 5

## STEP 1 - ORARI PICCO
Chiedi: "In quali orari hai bisogno di più personale?"
Esempi:
- "Pranzo dalle 12 alle 14" → ALTA_AFFLUENZA con ora_inizio/ora_fine
- "Aperitivo 18-20" → ALTA_AFFLUENZA

## STEP 2 - EVENTI RICORRENTI
Chiedi: "Hai eventi settimanali fissi? (scarichi, consegne, riunioni)"
Esempi:
- "Scarico merci giovedì mattina" → SCARICO_MERCI, giorno 4
- "Consegna ogni lunedì" → SCARICO_MERCI, giorno 1

## STEP 3 - ASSENZE
Chiedi: "Ci sono pattern ricorrenti di assenze? (riposi fissi, turni speciali)"
Esempi:
- "Marco riposa sempre il lunedì" → ASSENZA_FERIE (anche se è riposo, usa questa categoria)

## STEP 4 - CONFERMA
Riepilogo di tutte le criticità rilevate. Chiedi conferma per procedere.
Imposta isComplete=true nella risposta.

## DECISIONI SU NEXT STEP
- Se l'utente risponde con informazioni → estrai, poi passa al prossimo step
- Se dice "niente", "no", "nessuno" → passa al prossimo step senza estrarre
- Se siamo allo step 4 → imposta isComplete=true`;
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

    const { messages, currentStep = 0 } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messaggi non validi' }, { status: 400 });
    }

    // Carica config LLM
    const { data: llmConfig } = await supabase
      .from('LlmConfiguration')
      .select('planningChatModelId')
      .is('companyId', null)
      .limit(1);

    const model = llmConfig?.[0]?.planningChatModelId || 'x-ai/grok-4.1-fast';

    // Costruisci system prompt con info giorni chiusura
    const systemPrompt = buildSystemPrompt(currentStep, azienda.orario_apertura);

    const contextMessage = {
      role: 'system',
      content: `${systemPrompt}\n\n---\n\nAZIENDA: ${azienda.nome}`,
    };

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    // Chiamata OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Turnjob Criticita Onboarding',
      },
      body: JSON.stringify({
        model: model,
        messages: [contextMessage, ...messages],
        max_tokens: 800,
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
      data.choices?.[0]?.message?.content || 'Mi dispiace, non ho ricevuto una risposta. Riprova.';

    // Estrai criticità dal messaggio
    const extractedCriticita: unknown[] = [];
    const criticitaMatches = assistantMessage.matchAll(/```criticita\s*([\s\S]*?)```/g);
    for (const match of criticitaMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tipo && parsed.giorno_settimana) {
          extractedCriticita.push(parsed);
        }
      } catch {
        console.warn('Failed to parse criticità JSON block');
      }
    }

    // Determina il prossimo step
    let nextStep = currentStep;
    const lowerMessage = assistantMessage.toLowerCase();
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

    // Logica per avanzare allo step successivo
    const hasExtracted = extractedCriticita.length > 0;
    const userSaysNo =
      lastUserMessage.includes('niente') ||
      lastUserMessage.includes('nessun') ||
      lastUserMessage.includes('no ') ||
      lastUserMessage === 'no';
    const shouldAdvance = hasExtracted || userSaysNo || lowerMessage.includes('prossim');

    if (shouldAdvance && currentStep < 4) {
      nextStep = currentStep + 1;
    }

    // Verifica se l'onboarding è completo
    const isComplete =
      currentStep >= 4 ||
      lowerMessage.includes('procedi') ||
      lowerMessage.includes('conferma') ||
      lowerMessage.includes('completato');

    return NextResponse.json({
      message: assistantMessage,
      extractedCriticita,
      nextStep,
      isComplete,
    });
  } catch (error) {
    console.error('AI Criticita Onboarding error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
