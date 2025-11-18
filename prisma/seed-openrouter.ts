import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding OpenRouter models...');

  // 1. Crea provider OpenRouter
  const openRouterProvider = await prisma.llmProvider.upsert({
    where: { name: 'openrouter' },
    update: {},
    create: {
      name: 'openrouter',
      displayName: 'OpenRouter (Unified Gateway)',
      isActive: true,
      apiKey: null, // API key è in .env
    },
  });

  console.log('✅ Provider OpenRouter creato');

  // 2. Definisci modelli disponibili
  const models = [
    // xAI Grok
    {
      providerId: openRouterProvider.id,
      modelId: 'x-ai/grok-beta',
      displayName: 'Grok Beta',
      inputCostPer1M: 5.0,
      outputCostPer1M: 15.0,
      maxTokens: 131072,
      priority: 1,
      isActive: true,
    },
    {
      providerId: openRouterProvider.id,
      modelId: 'x-ai/grok-2-1212',
      displayName: 'Grok 2',
      inputCostPer1M: 2.0,
      outputCostPer1M: 10.0,
      maxTokens: 32768,
      priority: 2,
      isActive: true,
    },

    // OpenAI
    {
      providerId: openRouterProvider.id,
      modelId: 'openai/gpt-4o',
      displayName: 'GPT-4o',
      inputCostPer1M: 2.5,
      outputCostPer1M: 10.0,
      maxTokens: 128000,
      priority: 3,
      isActive: true,
    },
    {
      providerId: openRouterProvider.id,
      modelId: 'openai/gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.6,
      maxTokens: 128000,
      priority: 4,
      isActive: true,
    },

    // Anthropic Claude
    {
      providerId: openRouterProvider.id,
      modelId: 'anthropic/claude-3.5-sonnet',
      displayName: 'Claude 3.5 Sonnet',
      inputCostPer1M: 3.0,
      outputCostPer1M: 15.0,
      maxTokens: 200000,
      priority: 5,
      isActive: true,
    },
    {
      providerId: openRouterProvider.id,
      modelId: 'anthropic/claude-3-haiku',
      displayName: 'Claude 3 Haiku',
      inputCostPer1M: 0.25,
      outputCostPer1M: 1.25,
      maxTokens: 200000,
      priority: 6,
      isActive: true,
    },

    // Google Gemini
    {
      providerId: openRouterProvider.id,
      modelId: 'google/gemini-2.0-flash-exp:free',
      displayName: 'Gemini 2.0 Flash (Free)',
      inputCostPer1M: 0.0,
      outputCostPer1M: 0.0,
      maxTokens: 1000000,
      priority: 7,
      isActive: true,
    },
    {
      providerId: openRouterProvider.id,
      modelId: 'google/gemini-pro-1.5',
      displayName: 'Gemini 1.5 Pro',
      inputCostPer1M: 1.25,
      outputCostPer1M: 5.0,
      maxTokens: 2000000,
      priority: 8,
      isActive: true,
    },

    // Open Source (Free)
    {
      providerId: openRouterProvider.id,
      modelId: 'meta-llama/llama-3.2-90b-vision-instruct:free',
      displayName: 'Llama 3.2 90B (Free)',
      inputCostPer1M: 0.0,
      outputCostPer1M: 0.0,
      maxTokens: 8192,
      priority: 9,
      isActive: true,
    },
    {
      providerId: openRouterProvider.id,
      modelId: 'qwen/qwen-2.5-72b-instruct',
      displayName: 'Qwen 2.5 72B',
      inputCostPer1M: 0.35,
      outputCostPer1M: 0.35,
      maxTokens: 32768,
      priority: 10,
      isActive: true,
    },
  ];

  // 3. Crea tutti i modelli
  for (const model of models) {
    await prisma.llmModel.upsert({
      where: {
        providerId_modelId: {
          providerId: model.providerId,
          modelId: model.modelId,
        },
      },
      update: {
        displayName: model.displayName,
        inputCostPer1M: model.inputCostPer1M,
        outputCostPer1M: model.outputCostPer1M,
        maxTokens: model.maxTokens,
        priority: model.priority,
        isActive: model.isActive,
      },
      create: model,
    });
  }

  console.log(`✅ ${models.length} modelli OpenRouter creati`);

  // 4. Ottieni il modello Grok Beta per la configurazione
  const grokBeta = await prisma.llmModel.findFirst({
    where: {
      modelId: 'x-ai/grok-beta',
    },
  });

  if (!grokBeta) {
    throw new Error('Grok Beta model not found');
  }

  // 5. Aggiorna configurazione globale per usare Grok Beta
  await prisma.llmConfiguration.upsert({
    where: {
      companyId: null,
    },
    update: {
      onboardingModelId: grokBeta.id,
      constraintModelId: grokBeta.id,
      explanationModelId: grokBeta.id,
      validationModelId: grokBeta.id,
      enableFallback: true,
      fallbackModelIds: [], // OpenRouter gestisce fallback automaticamente
      dailyBudgetLimit: 50.0,
      monthlyBudgetLimit: 500.0,
      alertThreshold: 0.8,
      maxRetries: 3,
      timeoutSeconds: 30,
      enableCaching: true,
      cacheRetentionHours: 24,
    },
    create: {
      companyId: null,
      onboardingModelId: grokBeta.id,
      constraintModelId: grokBeta.id,
      explanationModelId: grokBeta.id,
      validationModelId: grokBeta.id,
      enableFallback: true,
      fallbackModelIds: [],
      dailyBudgetLimit: 50.0,
      monthlyBudgetLimit: 500.0,
      alertThreshold: 0.8,
      maxRetries: 3,
      timeoutSeconds: 30,
      enableCaching: true,
      cacheRetentionHours: 24,
    },
  });

  console.log('✅ Configurazione LLM globale aggiornata con Grok Beta');

  console.log('\n🎉 Seed OpenRouter completato con successo!');
  console.log('\nModelli disponibili:');
  console.log('  - xAI Grok Beta (primary)');
  console.log('  - xAI Grok 2');
  console.log('  - OpenAI GPT-4o');
  console.log('  - OpenAI GPT-4o Mini');
  console.log('  - Anthropic Claude 3.5 Sonnet');
  console.log('  - Anthropic Claude 3 Haiku');
  console.log('  - Google Gemini 2.0 Flash (FREE)');
  console.log('  - Google Gemini 1.5 Pro');
  console.log('  - Meta Llama 3.2 90B (FREE)');
  console.log('  - Qwen 2.5 72B');
}

main()
  .catch((e) => {
    console.error('❌ Errore durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
