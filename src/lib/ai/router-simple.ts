import { generateObject, generateText, streamText } from 'ai';
import { createOpenRouter } from './openrouter';
import { z } from 'zod';

/**
 * LLM Router semplificato senza dipendenza da Prisma
 * Usa direttamente Grok Beta per tutti i casi d'uso
 */
export class SimpleLlmRouter {
  private static instance: SimpleLlmRouter;
  private openRouter: ReturnType<typeof createOpenRouter>;

  static getInstance() {
    if (!this.instance) {
      this.instance = new SimpleLlmRouter();
    }
    return this.instance;
  }

  private constructor() {
    this.openRouter = createOpenRouter();
  }

  /**
   * Ottiene il modello specificato o usa Grok-4-fast come default
   */
  getModel(modelId?: string) {
    // Default: xAI Grok-4-fast
    const model = modelId || 'x-ai/grok-4-fast';
    return this.openRouter(model);
  }
}

/**
 * Helper: Genera oggetto strutturato da prompt
 */
export async function generateWithSimpleRouter<T extends z.ZodType>(
  prompt: string,
  schema: T,
  modelId?: string
): Promise<z.infer<T>> {
  const router = SimpleLlmRouter.getInstance();
  const model = router.getModel(modelId);

  const result = await generateObject({
    model,
    schema,
    prompt,
  });

  return result.object;
}

/**
 * Helper: Genera testo semplice da prompt
 */
export async function generateTextWithSimpleRouter(
  prompt: string,
  modelId?: string
): Promise<string> {
  const router = SimpleLlmRouter.getInstance();
  const model = router.getModel(modelId);

  const result = await generateText({
    model,
    prompt,
  });

  return result.text;
}

/**
 * Helper: Stream testo per chat
 */
export async function streamWithSimpleRouter(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelId?: string
) {
  const router = SimpleLlmRouter.getInstance();
  const model = router.getModel(modelId);

  return streamText({
    model,
    messages,
  });
}
