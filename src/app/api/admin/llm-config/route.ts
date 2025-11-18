import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API Admin - Configurazione LLM
 * Gestisce lettura e scrittura configurazione modelli AI
 */

const ConfigSchema = z.object({
  onboardingModelId: z.string(),
  constraintModelId: z.string(),
  explanationModelId: z.string(),
  validationModelId: z.string(),
  dailyBudgetLimit: z.number().min(0),
  monthlyBudgetLimit: z.number().min(0),
  alertThreshold: z.number().min(0).max(1),
});

/**
 * GET /api/admin/llm-config
 * Recupera configurazione LLM attuale e lista modelli disponibili
 */
export async function GET() {
  try {
    // TODO: Implementare lettura da database tramite Supabase MCP
    // Per ora ritorniamo dati mock

    const mockModels = [
      {
        id: '1',
        modelId: 'x-ai/grok-4-fast',
        displayName: 'Grok 4 Fast',
        inputCostPer1M: 5.0,
        outputCostPer1M: 15.0,
        maxTokens: 131072,
        isActive: true,
        priority: 1,
      },
      {
        id: '2',
        modelId: 'openai/gpt-4o',
        displayName: 'GPT-4o',
        inputCostPer1M: 2.5,
        outputCostPer1M: 10.0,
        maxTokens: 128000,
        isActive: true,
        priority: 2,
      },
      {
        id: '3',
        modelId: 'openai/gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.6,
        maxTokens: 128000,
        isActive: true,
        priority: 3,
      },
      {
        id: '4',
        modelId: 'anthropic/claude-3.5-sonnet',
        displayName: 'Claude 3.5 Sonnet',
        inputCostPer1M: 3.0,
        outputCostPer1M: 15.0,
        maxTokens: 200000,
        isActive: true,
        priority: 4,
      },
      {
        id: '5',
        modelId: 'anthropic/claude-3-haiku',
        displayName: 'Claude 3 Haiku',
        inputCostPer1M: 0.25,
        outputCostPer1M: 1.25,
        maxTokens: 200000,
        isActive: true,
        priority: 5,
      },
    ];

    const mockConfig = {
      onboardingModelId: 'x-ai/grok-4-fast',
      constraintModelId: 'x-ai/grok-4-fast',
      explanationModelId: 'x-ai/grok-4-fast',
      validationModelId: 'x-ai/grok-4-fast',
      dailyBudgetLimit: 50,
      monthlyBudgetLimit: 500,
      alertThreshold: 0.8,
    };

    return NextResponse.json({
      success: true,
      models: mockModels,
      config: mockConfig,
    });
  } catch (error) {
    console.error('Error fetching LLM config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/llm-config
 * Salva configurazione LLM
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validazione dati
    const validatedConfig = ConfigSchema.parse(body);

    console.log('[LLM Config] Saving configuration:', validatedConfig);

    // TODO: Implementare salvataggio su database tramite Supabase MCP
    // Per ora simuliamo un salvataggio con successo

    await new Promise((resolve) => setTimeout(resolve, 500)); // Simula latenza

    return NextResponse.json({
      success: true,
      message: 'Configurazione salvata con successo',
      config: validatedConfig,
    });
  } catch (error) {
    console.error('Error saving LLM config:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dati non validi',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
