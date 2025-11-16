-- Turnjob Database Schema for Supabase
-- Generated from Prisma schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE');
CREATE TYPE "RequestType" AS ENUM ('VACATION', 'PERMISSION', 'DAY_OFF', 'ROL');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Create Company table
CREATE TABLE "Company" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "logo" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "minAdvanceNoticeDays" INTEGER NOT NULL DEFAULT 3,
    "allowWeekendRequests" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "companyId" TEXT NOT NULL,
    "positionId" TEXT,
    "hireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customVacationDays" INTEGER,
    "customPermissionHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create Position table
CREATE TABLE "Position" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "companyId" TEXT NOT NULL,
    "maxSimultaneousAbsences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- Create TimeOffPolicy table
CREATE TABLE "TimeOffPolicy" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vacationDays" INTEGER NOT NULL DEFAULT 22,
    "permissionHours" INTEGER NOT NULL DEFAULT 72,
    "rolHours" INTEGER NOT NULL DEFAULT 0,
    "weeklyDaysOffMin" INTEGER NOT NULL DEFAULT 2,
    "weeklyDaysOffMax" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOffPolicy_pkey" PRIMARY KEY ("id")
);

-- Create Request table
CREATE TABLE "Request" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "userId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION,
    "notes" TEXT,
    "adminNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- Create BlackoutPeriod table
CREATE TABLE "BlackoutPeriod" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "blockAllRequests" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackoutPeriod_pkey" PRIMARY KEY ("id")
);

-- Create AuditLog table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create Unique Indexes
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Position_companyId_name_key" ON "Position"("companyId", "name");
CREATE UNIQUE INDEX "TimeOffPolicy_companyId_year_key" ON "TimeOffPolicy"("companyId", "year");

-- Create Indexes for performance
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_positionId_idx" ON "User"("positionId");
CREATE INDEX "Position_companyId_idx" ON "Position"("companyId");
CREATE INDEX "TimeOffPolicy_companyId_idx" ON "TimeOffPolicy"("companyId");
CREATE INDEX "Request_userId_idx" ON "Request"("userId");
CREATE INDEX "Request_startDate_endDate_idx" ON "Request"("startDate", "endDate");
CREATE INDEX "Request_status_idx" ON "Request"("status");
CREATE INDEX "BlackoutPeriod_companyId_idx" ON "BlackoutPeriod"("companyId");
CREATE INDEX "BlackoutPeriod_startDate_endDate_idx" ON "BlackoutPeriod"("startDate", "endDate");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Add Foreign Keys
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOffPolicy" ADD CONSTRAINT "TimeOffPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlackoutPeriod" ADD CONSTRAINT "BlackoutPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Position" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeOffPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlackoutPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Basic - puoi personalizzarle dopo)
-- Company policies
CREATE POLICY "Users can view their own company" ON "Company"
    FOR SELECT USING (id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid()::text));

CREATE POLICY "Admins can update their company" ON "Company"
    FOR UPDATE USING (id IN (
        SELECT "companyId" FROM "User"
        WHERE id = auth.uid()::text AND role = 'ADMIN'
    ));

-- User policies
CREATE POLICY "Users can view users in their company" ON "User"
    FOR SELECT USING ("companyId" IN (SELECT "companyId" FROM "User" WHERE id = auth.uid()::text));

CREATE POLICY "Users can update their own profile" ON "User"
    FOR UPDATE USING (id = auth.uid()::text);

CREATE POLICY "Admins can manage users in their company" ON "User"
    FOR ALL USING ("companyId" IN (
        SELECT "companyId" FROM "User"
        WHERE id = auth.uid()::text AND role = 'ADMIN'
    ));

-- Position policies
CREATE POLICY "Users can view positions in their company" ON "Position"
    FOR SELECT USING ("companyId" IN (SELECT "companyId" FROM "User" WHERE id = auth.uid()::text));

CREATE POLICY "Admins can manage positions" ON "Position"
    FOR ALL USING ("companyId" IN (
        SELECT "companyId" FROM "User"
        WHERE id = auth.uid()::text AND role = 'ADMIN'
    ));

-- Request policies
CREATE POLICY "Users can view requests in their company" ON "Request"
    FOR SELECT USING ("userId" IN (
        SELECT id FROM "User"
        WHERE "companyId" IN (SELECT "companyId" FROM "User" WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can create their own requests" ON "Request"
    FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can update their own pending requests" ON "Request"
    FOR UPDATE USING ("userId" = auth.uid()::text AND status = 'PENDING');

CREATE POLICY "Admins can manage all requests" ON "Request"
    FOR ALL USING ("userId" IN (
        SELECT id FROM "User"
        WHERE "companyId" IN (
            SELECT "companyId" FROM "User"
            WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    ));

-- TimeOffPolicy policies
CREATE POLICY "Users can view policies in their company" ON "TimeOffPolicy"
    FOR SELECT USING ("companyId" IN (SELECT "companyId" FROM "User" WHERE id = auth.uid()::text));

CREATE POLICY "Admins can manage policies" ON "TimeOffPolicy"
    FOR ALL USING ("companyId" IN (
        SELECT "companyId" FROM "User"
        WHERE id = auth.uid()::text AND role = 'ADMIN'
    ));

-- BlackoutPeriod policies
CREATE POLICY "Users can view blackout periods in their company" ON "BlackoutPeriod"
    FOR SELECT USING ("companyId" IN (SELECT "companyId" FROM "User" WHERE id = auth.uid()::text));

CREATE POLICY "Admins can manage blackout periods" ON "BlackoutPeriod"
    FOR ALL USING ("companyId" IN (
        SELECT "companyId" FROM "User"
        WHERE id = auth.uid()::text AND role = 'ADMIN'
    ));

-- AuditLog policies (read-only for admins)
CREATE POLICY "Admins can view audit logs" ON "AuditLog"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "User"
        WHERE id = auth.uid()::text AND role = 'ADMIN'
    ));

-- Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
CREATE TRIGGER update_company_updated_at BEFORE UPDATE ON "Company"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_position_updated_at BEFORE UPDATE ON "Position"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeoffpolicy_updated_at BEFORE UPDATE ON "TimeOffPolicy"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_updated_at BEFORE UPDATE ON "Request"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blackoutperiod_updated_at BEFORE UPDATE ON "BlackoutPeriod"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional - puoi commentare se non vuoi dati di test)
-- Sample Company
INSERT INTO "Company" ("id", "name", "email", "minAdvanceNoticeDays", "allowWeekendRequests")
VALUES ('company-1', 'Azienda Demo', 'admin@azienda-demo.it', 3, true);

-- Sample TimeOffPolicy for current year
INSERT INTO "TimeOffPolicy" ("companyId", "year", "vacationDays", "permissionHours", "weeklyDaysOffMin", "weeklyDaysOffMax")
VALUES ('company-1', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 22, 72, 2, 3);

-- Sample Positions
INSERT INTO "Position" ("companyId", "name", "description", "color", "maxSimultaneousAbsences")
VALUES
    ('company-1', 'Cameriere', 'Servizio sala', '#3b82f6', 2),
    ('company-1', 'Cuoco', 'Cucina', '#22c55e', 1),
    ('company-1', 'Barista', 'Bar e bevande', '#f59e0b', 1);

-- Note: Gli utenti verranno creati automaticamente tramite Supabase Auth
-- Dovrai sincronizzare gli auth.users con la tabella User dopo la registrazione

COMMIT;
