import { createOpenAI } from '@ai-sdk/openai';

/**
 * OpenRouter client configurato per Vercel AI SDK
 * Docs: https://openrouter.ai/docs
 */
export function createOpenRouter(config?: { apiKey?: string }) {
  const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  return createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
      'X-Title': 'Turnjob',
    },
  });
}

/**
 * Modelli disponibili via OpenRouter
 * Prezzi aggiornati: https://openrouter.ai/models
 */
export const OPENROUTER_MODELS = {
  // xAI Grok (consigliato per onboarding)
  grokBeta: 'x-ai/grok-beta',
  grok2: 'x-ai/grok-2-1212',

  // OpenAI (fallback premium)
  gpt4o: 'openai/gpt-4o',
  gpt4oMini: 'openai/gpt-4o-mini',
  gpt4Turbo: 'openai/gpt-4-turbo',

  // Anthropic Claude (fallback premium)
  claude35Sonnet: 'anthropic/claude-3.5-sonnet',
  claude3Opus: 'anthropic/claude-3-opus',
  claude3Haiku: 'anthropic/claude-3-haiku',

  // Google Gemini (fallback economico)
  gemini2Flash: 'google/gemini-2.0-flash-exp:free',
  gemini15Pro: 'google/gemini-pro-1.5',
  gemini15Flash: 'google/gemini-flash-1.5',

  // Open Source (fallback gratuito)
  llama32_90b: 'meta-llama/llama-3.2-90b-vision-instruct:free',
  llama31_70b: 'meta-llama/llama-3.1-70b-instruct:free',
  qwen32b: 'qwen/qwen-2.5-72b-instruct',
  mistral7b: 'mistralai/mistral-7b-instruct:free',
} as const;

export type OpenRouterModel = (typeof OPENROUTER_MODELS)[keyof typeof OPENROUTER_MODELS];
