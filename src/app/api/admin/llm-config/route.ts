import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();

    // 1. Fetch active models
    const { data: models, error: modelsError } = await supabase
      .from('LlmModel')
      .select('*')
      .eq('isActive', true)
      .order('inputCostPer1M', { ascending: true });

    if (modelsError) {
      throw new Error(`Error fetching models: ${modelsError.message}`);
    }

    // 2. Fetch global configuration (companyId is null)
    const { data: config, error: configError } = await supabase
      .from('LlmConfiguration')
      .select('*')
      .is('companyId', null)
      .single();

    if (configError && configError.code !== 'PGRST116') { // Ignore "Row not found" if it's just missing
      throw new Error(`Error fetching config: ${configError.message}`);
    }

    // Default config if not found
    const finalConfig = config || {
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
      models: models || [],
      config: {
        onboardingModelId: finalConfig.onboardingModelId,
        constraintModelId: finalConfig.constraintModelId,
        explanationModelId: finalConfig.explanationModelId,
        validationModelId: finalConfig.validationModelId,
        dailyBudgetLimit: finalConfig.dailyBudgetLimit,
        monthlyBudgetLimit: finalConfig.monthlyBudgetLimit,
        alertThreshold: finalConfig.alertThreshold,
      },
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

    const supabase = await createClient();

    // First check if exists to decide insert or update (safer without knowing ID)
    const { data: existing } = await supabase
      .from('LlmConfiguration')
      .select('id')
      .is('companyId', null)
      .single();

    let updateError;

    if (existing) {
      const { error: updErr } = await supabase
        .from('LlmConfiguration')
        .update({
          ...validatedConfig,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existing.id);
      updateError = updErr;
    } else {
      const { error: insErr } = await supabase
        .from('LlmConfiguration')
        .insert({
          companyId: null,
          ...validatedConfig,
        });
      updateError = insErr;
    }

    if (updateError) {
      throw new Error(`Error saving config: ${updateError.message}`);
    }

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
