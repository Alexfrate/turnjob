-- Seed data converted from prisma/seed.ts
-- Execute after applying migration.sql

-- ============================================
-- 1. Default Skills
-- ============================================

INSERT INTO "Skill" ("id", "name", "category", "createdAt") VALUES
(uuid_generate_v4(), 'Barista', 'technical', CURRENT_TIMESTAMP),
(uuid_generate_v4(), 'Cameriere', 'technical', CURRENT_TIMESTAMP),
(uuid_generate_v4(), 'Cuoco', 'technical', CURRENT_TIMESTAMP),
(uuid_generate_v4(), 'Primo Soccorso', 'certification', CURRENT_TIMESTAMP),
(uuid_generate_v4(), 'HACCP', 'certification', CURRENT_TIMESTAMP),
(uuid_generate_v4(), 'Sommelier', 'certification', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- ============================================
-- 2. Default LLM Provider (xAI)
-- ============================================

INSERT INTO "LlmProvider" ("id", "name", "displayName", "isActive", "apiKey", "createdAt", "updatedAt") VALUES
(uuid_generate_v4(), 'xai', 'xAI (Grok)', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- ============================================
-- 3. Default LLM Model (Grok Beta)
-- ============================================

-- Note: This assumes the xai provider exists. In a real scenario, you'd need to get the provider ID
-- For simplicity, we'll insert with a placeholder and update if needed

INSERT INTO "LlmModel" ("id", "providerId", "modelId", "displayName", "inputCostPer1M", "outputCostPer1M", "supportsStreaming", "supportsStructured", "maxTokens", "isActive", "priority", "createdAt", "updatedAt")
SELECT
  uuid_generate_v4(),
  p.id,
  'grok-beta',
  'Grok Beta',
  5.0,
  15.0,
  true,
  true,
  131072,
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "LlmProvider" p
WHERE p.name = 'xai'
ON CONFLICT ("providerId", "modelId") DO NOTHING;

-- ============================================
-- 4. Global LLM Configuration
-- ============================================

-- Insert only if not exists
INSERT INTO "LlmConfiguration" ("id", "companyId", "onboardingModelId", "constraintModelId", "explanationModelId", "validationModelId", "enableFallback", "fallbackModelIds", "dailyBudgetLimit", "monthlyBudgetLimit", "alertThreshold", "maxRetries", "timeoutSeconds", "enableCaching", "cacheRetentionHours", "createdAt", "updatedAt")
SELECT
  uuid_generate_v4(),
  null,
  m.id,
  m.id,
  m.id,
  m.id,
  false,
  '{}',
  50.0,
  500.0,
  0.8,
  3,
  30,
  true,
  24,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "LlmModel" m
WHERE m."modelId" = 'grok-beta'
  AND NOT EXISTS (SELECT 1 FROM "LlmConfiguration" WHERE "companyId" IS NULL)
ON CONFLICT DO NOTHING;