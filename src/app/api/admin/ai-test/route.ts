import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkIsSuperAdmin } from '@/lib/auth/check-super-admin';

/**
 * POST /api/admin/ai-test
 * Test sandbox per modelli AI - Solo super_admin
 */
export async function POST(request: Request) {
  const startTime = Date.now();

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
    const { modelId, systemPrompt, userMessage, temperature = 0.7, maxTokens = 1000 } = body;

    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Modello non specificato' },
        { status: 400 }
      );
    }

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: 'Messaggio utente mancante' },
        { status: 400 }
      );
    }

    // Costruisci messaggi
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    // Chiamata a OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Turnjob AI Test Sandbox',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));
      console.error('OpenRouter error:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: `Errore OpenRouter: ${errorData.error?.message || openRouterResponse.statusText}`
        },
        { status: openRouterResponse.status }
      );
    }

    const data = await openRouterResponse.json();
    const responseTime = Date.now() - startTime;

    // Estrai statistiche
    const usage = data.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;

    // Calcola costo stimato (valori approssimativi)
    // TODO: Usare costi reali dal modello
    const estimatedCost = (inputTokens * 0.000001 + outputTokens * 0.000002);

    // Estrai risposta
    const assistantMessage = data.choices?.[0]?.message?.content || 'Nessuna risposta';

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      stats: {
        modelId,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: Number(estimatedCost.toFixed(6)),
        responseTimeMs: responseTime,
        finishReason: data.choices?.[0]?.finish_reason || 'unknown',
      },
      raw: {
        id: data.id,
        model: data.model,
        created: data.created,
      },
    });
  } catch (error) {
    console.error('Error in AI test:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore interno del server'
      },
      { status: 500 }
    );
  }
}
