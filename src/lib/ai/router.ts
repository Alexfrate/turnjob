import { generateObject, generateText, streamText } from 'ai';
import { createOpenRouter, OPENROUTER_MODELS } from './openrouter';
import { db } from '@/lib/db';
import { z } from 'zod';

export type UseCase = 'onboarding' | 'constraint' | 'explanation' | 'validation';

/**
 * LLM Router centrale
 * Gestisce routing intelligente tra modelli via OpenRouter
 */
export class LlmRouter {
  private static instance: LlmRouter;
  private openRouter: ReturnType<typeof createOpenRouter>;

  static getInstance() {
    if (!this.instance) {
      this.instance = new LlmRouter();
    }
    return this.instance;
  }

  private constructor() {
    this.openRouter = createOpenRouter();
  }

  /**
   * Ottiene il modello configurato per uno specifico use case
   */
  async getModel(useCase: UseCase, companyId?: string) {
    const config = await this.getConfiguration(companyId);

    if (!config) {
      throw new Error('LLM configuration not found');
    }

    const modelIdMap = {
      onboarding: config.onboardingModelId,
      constraint: config.constraintModelId,
      explanation: config.explanationModelId,
      validation: config.validationModelId,
    };

    const modelId = modelIdMap[useCase];
    const modelConfig = await db.llmModel.findUnique({
      where: { id: modelId },
      include: { provider: true },
    });

    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Tutti i modelli passano attraverso OpenRouter
    // modelConfig.modelId contiene il nome OpenRouter (es: "x-ai/grok-beta")
    return {
      model: this.openRouter(modelConfig.modelId),
      config: modelConfig,
    };
  }

  /**
   * Esegue un'operazione con fallback automatico
   */
  async executeWithFallback<T>(
    useCase: UseCase,
    operation: (model: any) => Promise<T>,
    companyId?: string
  ): Promise<T> {
    const { model, config } = await this.getModel(useCase, companyId);
    const startTime = Date.now();

    try {
      const result = await operation(model);

      // Log success
      await this.logUsage({
        companyId: companyId || 'system',
        modelId: config.id,
        useCase,
        inputTokens: 0, // Verrà popolato dalla response
        outputTokens: 0,
        totalCost: 0,
        latencyMs: Date.now() - startTime,
        wasSuccessful: true,
      });

      return result;
    } catch (error) {
      // Log failure
      await this.logUsage({
        companyId: companyId || 'system',
        modelId: config.id,
        useCase,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        latencyMs: Date.now() - startTime,
        wasSuccessful: false,
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Ottiene la configurazione LLM (globale o per company)
   */
  private async getConfiguration(companyId?: string) {
    return await db.llmConfiguration.findFirst({
      where: { companyId: companyId || null },
    });
  }

  /**
   * Registra l'utilizzo di un modello
   */
  private async logUsage(log: {
    companyId: string;
    modelId: string;
    useCase: string;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    latencyMs: number;
    wasSuccessful: boolean;
    errorMessage?: string;
    metadata?: any;
  }) {
    try {
      await db.aiGenerationLog.create({ data: log });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }
}

/**
 * Helper: Genera oggetto strutturato da prompt
 */
export async function generateWithRouter<T extends z.ZodType>(
  useCase: UseCase,
  prompt: string,
  schema: T,
  companyId?: string
): Promise<z.infer<T>> {
  const router = LlmRouter.getInstance();

  return router.executeWithFallback(
    useCase,
    async (model) => {
      const result = await generateObject({
        model,
        schema,
        prompt,
      });
      return result.object;
    },
    companyId
  );
}

/**
 * Helper: Genera testo semplice da prompt
 */
export async function generateTextWithRouter(
  useCase: UseCase,
  prompt: string,
  companyId?: string
): Promise<string> {
  const router = LlmRouter.getInstance();

  return router.executeWithFallback(
    useCase,
    async (model) => {
      const result = await generateText({
        model,
        prompt,
      });
      return result.text;
    },
    companyId
  );
}

/**
 * Helper: Stream testo per chat
 */
export async function streamWithRouter(
  useCase: UseCase,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  companyId?: string
) {
  const router = LlmRouter.getInstance();
  const { model } = await router.getModel(useCase, companyId);

  return streamText({
    model,
    messages,
  });
}
