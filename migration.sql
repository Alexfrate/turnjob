-- Migration: Create all tables from Prisma schema
-- Generated from prisma/schema.prisma

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

CREATE TYPE "RequestType" AS ENUM ('VACATION', 'PERMISSION', 'DAY_OFF', 'ROL', 'SICK_LEAVE');

CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TYPE "OnboardingMode" AS ENUM ('MANUAL', 'AI_ASSISTED', 'HYBRID');

CREATE TYPE "ScheduleGenerationType" AS ENUM ('AI_GENERATED', 'MANUAL', 'HYBRID');

CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- ============================================
-- CORE ENTITIES
-- ============================================

CREATE TABLE "Company" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "logo" TEXT,
    "industry" TEXT,
    "preferredOnboardingMode" "OnboardingMode" DEFAULT 'MANUAL',
    "hasCompletedOnboarding" BOOLEAN DEFAULT false,
    "onboardingStep" INTEGER DEFAULT 0,
    "aiOnboardingData" JSONB,
    "businessRules" JSONB DEFAULT '{}',
    "settings" JSONB DEFAULT '{}',
    "timezone" TEXT DEFAULT 'Europe/Rome',
    "locale" TEXT DEFAULT 'it',
    "minAdvanceNoticeDays" INTEGER DEFAULT 3,
    "allowWeekendRequests" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "role" "UserRole" DEFAULT 'EMPLOYEE',
    "companyId" UUID NOT NULL,
    "positionId" UUID,
    "hireDate" TIMESTAMP(3),
    "employmentType" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "availability" JSONB,
    "preferences" JSONB,
    "customVacationDays" INTEGER,
    "customPermissionHours" INTEGER,
    "customRolHours" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "Position" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3b82f6',
    "companyId" UUID NOT NULL,
    "maxSimultaneousAbsences" INTEGER DEFAULT 1,
    "minStaffPerShift" INTEGER DEFAULT 1,
    "requiredSkillIds" TEXT[],
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "Skill" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL UNIQUE,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "EmployeeSkill" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "proficiency" INTEGER DEFAULT 1,
    "certifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3)
);

-- ============================================
-- SCHEDULING
-- ============================================

CREATE TABLE "Schedule" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "companyId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "generationType" "ScheduleGenerationType" DEFAULT 'MANUAL',
    "status" "ScheduleStatus" DEFAULT 'DRAFT',
    "aiMetadata" JSONB,
    "parentId" UUID,
    "version" INTEGER DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "Shift" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "scheduleId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "positionId" UUID,
    "requiredRole" TEXT,
    "minStaff" INTEGER DEFAULT 1,
    "maxStaff" INTEGER,
    "isAiGenerated" BOOLEAN DEFAULT false,
    "isManuallyEdited" BOOLEAN DEFAULT false,
    "aiConfidence" FLOAT,
    "aiReasoning" TEXT,
    "breakMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "ShiftAssignment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "shiftId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignmentType" TEXT NOT NULL,
    "confidenceScore" FLOAT,
    "isConfirmed" BOOLEAN DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- ============================================
-- REQUESTS (Ferie, Permessi)
-- ============================================

CREATE TABLE "Request" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "hours" FLOAT,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "TimeOffPolicy" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "vacationDays" INTEGER DEFAULT 22,
    "permissionHours" INTEGER DEFAULT 72,
    "rolHours" INTEGER DEFAULT 0,
    "weeklyDaysOffMin" INTEGER DEFAULT 2,
    "weeklyDaysOffMax" INTEGER DEFAULT 3,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- ============================================
-- CONSTRAINTS
-- ============================================

CREATE TABLE "Constraint" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "priority" INTEGER DEFAULT 1,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "BlackoutPeriod" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "blockAllRequests" BOOLEAN DEFAULT false,
    "maxRequestsAllowed" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- ============================================
-- ONBOARDING
-- ============================================

CREATE TABLE "OnboardingSession" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" UUID NOT NULL,
    "mode" "OnboardingMode" NOT NULL,
    "conversationLog" JSONB NOT NULL,
    "extractedData" JSONB,
    "currentStep" INTEGER DEFAULT 0,
    "totalSteps" INTEGER DEFAULT 5,
    "isCompleted" BOOLEAN DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- ============================================
-- LLM MANAGEMENT
-- ============================================

CREATE TABLE "LlmProvider" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL UNIQUE,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "LlmModel" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "providerId" UUID NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "inputCostPer1M" FLOAT NOT NULL,
    "outputCostPer1M" FLOAT NOT NULL,
    "supportsStreaming" BOOLEAN DEFAULT true,
    "supportsStructured" BOOLEAN DEFAULT true,
    "maxTokens" INTEGER DEFAULT 4096,
    "isActive" BOOLEAN DEFAULT true,
    "priority" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "LlmConfiguration" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" UUID UNIQUE,
    "onboardingModelId" TEXT NOT NULL,
    "constraintModelId" TEXT NOT NULL,
    "explanationModelId" TEXT NOT NULL,
    "validationModelId" TEXT NOT NULL,
    "enableFallback" BOOLEAN DEFAULT true,
    "fallbackModelIds" TEXT[],
    "dailyBudgetLimit" FLOAT,
    "monthlyBudgetLimit" FLOAT,
    "alertThreshold" FLOAT DEFAULT 0.8,
    "maxRetries" INTEGER DEFAULT 3,
    "timeoutSeconds" INTEGER DEFAULT 30,
    "enableCaching" BOOLEAN DEFAULT true,
    "cacheRetentionHours" INTEGER DEFAULT 24,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE TABLE "AiGenerationLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "companyId" TEXT NOT NULL,
    "modelId" UUID NOT NULL,
    "useCase" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalCost" FLOAT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "wasSuccessful" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AUDIT & TRACKING
-- ============================================

CREATE TABLE "ScheduleAuditLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "scheduleId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changesBefore" JSONB,
    "changesAfter" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX "Company_email_idx" ON "Company"("email");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_positionId_idx" ON "User"("positionId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "Position_companyId_name_key" ON "Position"("companyId", "name");
CREATE INDEX "Position_companyId_idx" ON "Position"("companyId");
CREATE UNIQUE INDEX "EmployeeSkill_userId_skillId_key" ON "EmployeeSkill"("userId", "skillId");
CREATE INDEX "Schedule_companyId_idx" ON "Schedule"("companyId");
CREATE INDEX "Schedule_startDate_endDate_idx" ON "Schedule"("startDate", "endDate");
CREATE INDEX "Schedule_status_idx" ON "Schedule"("status");
CREATE INDEX "Shift_scheduleId_idx" ON "Shift"("scheduleId");
CREATE INDEX "Shift_date_idx" ON "Shift"("date");
CREATE UNIQUE INDEX "ShiftAssignment_shiftId_userId_key" ON "ShiftAssignment"("shiftId", "userId");
CREATE INDEX "ShiftAssignment_userId_idx" ON "ShiftAssignment"("userId");
CREATE INDEX "Request_userId_idx" ON "Request"("userId");
CREATE INDEX "Request_status_idx" ON "Request"("status");
CREATE INDEX "Request_startDate_endDate_idx" ON "Request"("startDate", "endDate");
CREATE UNIQUE INDEX "TimeOffPolicy_companyId_year_key" ON "TimeOffPolicy"("companyId", "year");
CREATE INDEX "TimeOffPolicy_companyId_idx" ON "TimeOffPolicy"("companyId");
CREATE INDEX "Constraint_companyId_idx" ON "Constraint"("companyId");
CREATE INDEX "Constraint_category_idx" ON "Constraint"("category");
CREATE INDEX "BlackoutPeriod_companyId_idx" ON "BlackoutPeriod"("companyId");
CREATE INDEX "BlackoutPeriod_startDate_endDate_idx" ON "BlackoutPeriod"("startDate", "endDate");
CREATE INDEX "OnboardingSession_companyId_idx" ON "OnboardingSession"("companyId");
CREATE UNIQUE INDEX "LlmModel_providerId_modelId_key" ON "LlmModel"("providerId", "modelId");
CREATE INDEX "AiGenerationLog_companyId_createdAt_idx" ON "AiGenerationLog"("companyId", "createdAt");
CREATE INDEX "AiGenerationLog_modelId_createdAt_idx" ON "AiGenerationLog"("modelId", "createdAt");
CREATE INDEX "ScheduleAuditLog_scheduleId_idx" ON "ScheduleAuditLog"("scheduleId");
CREATE INDEX "ScheduleAuditLog_userId_idx" ON "ScheduleAuditLog"("userId");
CREATE INDEX "ScheduleAuditLog_createdAt_idx" ON "ScheduleAuditLog"("createdAt");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOffPolicy" ADD CONSTRAINT "TimeOffPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlackoutPeriod" ADD CONSTRAINT "BlackoutPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LlmModel" ADD CONSTRAINT "LlmModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LlmProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LlmConfiguration" ADD CONSTRAINT "LlmConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "LlmModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleAuditLog" ADD CONSTRAINT "ScheduleAuditLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;