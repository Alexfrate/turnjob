import { NextRequest, NextResponse } from 'next/server';
import { generateWithSimpleRouter, generateTextWithSimpleRouter } from '@/lib/ai/router-simple';
import { z } from 'zod';

/**
 * API Route di test per LLM Router + OpenRouter
 *
 * Test 1: Structured output (generateObject)
 * POST /api/ai/test { "type": "structured", "prompt": "..." }
 *
 * Test 2: Simple text (generateText)
 * POST /api/ai/test { "type": "text", "prompt": "..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = 'text', prompt, model } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (type === 'structured') {
      // Test structured output con Zod schema
      const schema = z.object({
        businessType: z.string().describe('Tipo di business (es: ristorante, hotel, retail)'),
        employeeCount: z.number().describe('Numero stimato di dipendenti'),
        workingHours: z.object({
          start: z.string().describe('Orario apertura (es: 09:00)'),
          end: z.string().describe('Orario chiusura (es: 18:00)'),
        }).describe('Orari lavorativi standard'),
        peakDays: z.array(z.string()).describe('Giorni di punta (es: ["venerdì", "sabato"])'),
      });

      const result = await generateWithSimpleRouter(
        prompt,
        schema,
        model
      );

      return NextResponse.json({
        success: true,
        type: 'structured',
        result,
        model: model || 'x-ai/grok-4-fast (default)',
      });
    } else {
      // Test simple text generation
      const result = await generateTextWithSimpleRouter(
        prompt,
        model
      );

      return NextResponse.json({
        success: true,
        type: 'text',
        result,
        model: model || 'x-ai/grok-4-fast (default)',
      });
    }
  } catch (error) {
    console.error('AI Test Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint per verificare configurazione
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'OK',
      message: 'LLM Router + OpenRouter configurato correttamente',
      endpoints: {
        test_text: {
          method: 'POST',
          body: {
            type: 'text',
            prompt: 'Scrivi una breve descrizione di un ristorante italiano',
          },
        },
        test_structured: {
          method: 'POST',
          body: {
            type: 'structured',
            prompt: 'Estrai informazioni da questo testo: "Gestisco una pizzeria a Milano con 15 dipendenti. Siamo aperti dalle 12:00 alle 23:00. I giorni più affollati sono venerdì, sabato e domenica."',
          },
        },
      },
      environment: {
        hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
