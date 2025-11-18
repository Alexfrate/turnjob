import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. Default Skills
  // ============================================
  console.log('📦 Creating default skills...');

  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: 'Barista' },
      update: {},
      create: { name: 'Barista', category: 'technical' }
    }),
    prisma.skill.upsert({
      where: { name: 'Cameriere' },
      update: {},
      create: { name: 'Cameriere', category: 'technical' }
    }),
    prisma.skill.upsert({
      where: { name: 'Cuoco' },
      update: {},
      create: { name: 'Cuoco', category: 'technical' }
    }),
    prisma.skill.upsert({
      where: { name: 'Primo Soccorso' },
      update: {},
      create: { name: 'Primo Soccorso', category: 'certification' }
    }),
    prisma.skill.upsert({
      where: { name: 'HACCP' },
      update: {},
      create: { name: 'HACCP', category: 'certification' }
    }),
    prisma.skill.upsert({
      where: { name: 'Sommelier' },
      update: {},
      create: { name: 'Sommelier', category: 'certification' }
    }),
  ]);

  console.log(`✅ Created ${skills.length} skills`);

  // ============================================
  // 2. Default LLM Provider (xAI)
  // ============================================
  console.log('🤖 Creating default LLM provider...');

  const xaiProvider = await prisma.llmProvider.upsert({
    where: { name: 'xai' },
    update: {},
    create: {
      name: 'xai',
      displayName: 'xAI (Grok)',
      isActive: true,
      apiKey: null, // Will be configured later
    }
  });

  console.log('✅ Created xAI provider');

  // ============================================
  // 3. Default LLM Model (Grok Beta)
  // ============================================
  console.log('🤖 Creating default LLM model...');

  const grokModel = await prisma.llmModel.upsert({
    where: {
      providerId_modelId: {
        providerId: xaiProvider.id,
        modelId: 'grok-beta'
      }
    },
    update: {},
    create: {
      providerId: xaiProvider.id,
      modelId: 'grok-beta',
      displayName: 'Grok Beta',
      inputCostPer1M: 5.0,
      outputCostPer1M: 15.0,
      supportsStreaming: true,
      supportsStructured: true,
      maxTokens: 131072,
      isActive: true,
      priority: 1
    }
  });

  console.log('✅ Created Grok Beta model');

  // ============================================
  // 4. Global LLM Configuration
  // ============================================
  console.log('⚙️  Creating global LLM configuration...');

  const existingConfig = await prisma.llmConfiguration.findFirst({
    where: { companyId: null }
  });

  if (!existingConfig) {
    await prisma.llmConfiguration.create({
      data: {
        companyId: null, // Global default
        onboardingModelId: grokModel.id,
        constraintModelId: grokModel.id,
        explanationModelId: grokModel.id,
        validationModelId: grokModel.id,
        enableFallback: false,
        fallbackModelIds: [],
        dailyBudgetLimit: 50.0,
        monthlyBudgetLimit: 500.0,
        alertThreshold: 0.8,
        maxRetries: 3,
        timeoutSeconds: 30,
        enableCaching: true,
        cacheRetentionHours: 24
      }
    });
    console.log('✅ Created global LLM configuration');
  } else {
    console.log('ℹ️  Global LLM configuration already exists');
  }

  // ============================================
  // 5. Optional: OpenAI Fallback (commented out - configure when needed)
  // ============================================
  /*
  console.log('🤖 Creating OpenAI fallback provider...');

  const openaiProvider = await prisma.llmProvider.upsert({
    where: { name: 'openai' },
    update: {},
    create: {
      name: 'openai',
      displayName: 'OpenAI',
      isActive: false, // Disabled by default
      apiKey: null,
    }
  });

  const gpt4Model = await prisma.llmModel.upsert({
    where: {
      providerId_modelId: {
        providerId: openaiProvider.id,
        modelId: 'gpt-4o'
      }
    },
    update: {},
    create: {
      providerId: openaiProvider.id,
      modelId: 'gpt-4o',
      displayName: 'GPT-4 Optimized',
      inputCostPer1M: 2.5,
      outputCostPer1M: 10.0,
      supportsStreaming: true,
      supportsStructured: true,
      maxTokens: 128000,
      isActive: false,
      priority: 2
    }
  });

  console.log('✅ Created OpenAI fallback provider');
  */

  console.log('\n🎉 Database seed completed successfully!\n');

  console.log('📊 Summary:');
  console.log(`   - Skills: ${skills.length}`);
  console.log(`   - LLM Providers: 1 (xAI)`);
  console.log(`   - LLM Models: 1 (Grok Beta)`);
  console.log(`   - Global Configuration: 1`);
  console.log('\n✨ Next steps:');
  console.log('   1. Configure xAI API Key in admin panel');
  console.log('   2. Run: npm run dev');
  console.log('   3. Navigate to /admin/llm-config to verify setup\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
