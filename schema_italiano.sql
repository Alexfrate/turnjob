-- ============================================
-- TURNJOB - MIGRATION COMPLETA
-- Schema Database in Italiano
-- ============================================

-- Elimina tutte le tabelle vecchie
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "ScheduleAuditLog" CASCADE;
DROP TABLE IF EXISTS "AiGenerationLog" CASCADE;
DROP TABLE IF EXISTS "LlmConfiguration" CASCADE;
DROP TABLE IF EXISTS "LlmModel" CASCADE;
DROP TABLE IF EXISTS "LlmProvider" CASCADE;
DROP TABLE IF EXISTS "OnboardingSession" CASCADE;
DROP TABLE IF EXISTS "BlackoutPeriod" CASCADE;
DROP TABLE IF EXISTS "Constraint" CASCADE;
DROP TABLE IF EXISTS "TimeOffPolicy" CASCADE;
DROP TABLE IF EXISTS "Request" CASCADE;
DROP TABLE IF EXISTS "ShiftAssignment" CASCADE;
DROP TABLE IF EXISTS "Shift" CASCADE;
DROP TABLE IF EXISTS "Schedule" CASCADE;
DROP TABLE IF EXISTS "EmployeeSkill" CASCADE;
DROP TABLE IF EXISTS "Skill" CASCADE;
DROP TABLE IF EXISTS "Position" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Company" CASCADE;

-- Elimina tipi enum vecchi
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "RequestType" CASCADE;
DROP TYPE IF EXISTS "RequestStatus" CASCADE;
DROP TYPE IF EXISTS "OnboardingMode" CASCADE;
DROP TYPE IF EXISTS "ScheduleGenerationType" CASCADE;
DROP TYPE IF EXISTS "ScheduleStatus" CASCADE;

-- ============================================
-- NUOVI ENUM
-- ============================================

CREATE TYPE "TipoAttivita" AS ENUM ('ristorazione', 'retail', 'hotel', 'altro');
CREATE TYPE "TipoOrario" AS ENUM ('fisso', 'variabile');
CREATE TYPE "RuoloAmministratore" AS ENUM ('super_admin', 'admin', 'manager');
CREATE TYPE "TipoContratto" AS ENUM ('full_time', 'part_time', 'altro');
CREATE TYPE "TipoRichiesta" AS ENUM ('ferie', 'permesso', 'riposo');
CREATE TYPE "StatoRichiesta" AS ENUM ('in_attesa', 'approvata', 'rifiutata', 'cancellata');
CREATE TYPE "TipoAssegnazione" AS ENUM ('manuale', 'richiesta_collaboratore', 'suggerita_ai');

-- ============================================
-- TABELLE PRINCIPALI
-- ============================================

-- 1. AZIENDA
CREATE TABLE "Azienda" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" TEXT NOT NULL,
    "tipo_attivita" "TipoAttivita" NOT NULL,
    "tipo_orario" "TipoOrario" NOT NULL,
    
    -- Orari (JSONB flessibile per fisso/variabile)
    -- Fisso: {"tipo": "fisso", "inizio": "08:00", "fine": "22:00"}
    -- Variabile: {"tipo": "variabile", "lun": {"inizio": "08:00", "fine": "22:00", "chiuso": false}, ...}
    "orario_apertura" JSONB NOT NULL,
    
    "super_admin_email" TEXT NOT NULL,
    "completato_onboarding" BOOLEAN DEFAULT false,
    
    -- Politiche Default
    "ferie_annuali_default" INTEGER DEFAULT 22,
    "permessi_annuali_default" INTEGER DEFAULT 72,
    "riposi_settimanali_default" INTEGER DEFAULT 2,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AMMINISTRATORE
CREATE TABLE "Amministratore" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "azienda_id" UUID NOT NULL REFERENCES "Azienda"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL UNIQUE,
    "nome" TEXT NOT NULL,
    "ruolo" "RuoloAmministratore" NOT NULL DEFAULT 'manager',
    
    -- Permessi Granulari (solo per admin/manager, ignorati se super_admin)
    "puo_modificare_orari" BOOLEAN DEFAULT false,
    "puo_modificare_collaboratori" BOOLEAN DEFAULT false,
    "puo_modificare_turni" BOOLEAN DEFAULT false,
    "puo_gestire_ferie" BOOLEAN DEFAULT false,
    "puo_gestire_permessi" BOOLEAN DEFAULT false,
    "puo_modificare_nuclei" BOOLEAN DEFAULT false,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. COLLABORATORE
CREATE TABLE "Collaboratore" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "azienda_id" UUID NOT NULL REFERENCES "Azienda"("id") ON DELETE CASCADE,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "telefono" TEXT,
    
    -- Ore Contrattuali
    "ore_settimanali" INTEGER NOT NULL,
    "ore_mensili" INTEGER, -- calcolato automaticamente
    "tipo_contratto" "TipoContratto" DEFAULT 'full_time',
    
    -- Quote Personalizzate (override nuclei/azienda)
    "ferie_annuali_custom" INTEGER,
    "permessi_annuali_custom" INTEGER,
    "riposi_settimanali_custom" INTEGER,
    
    "data_assunzione" DATE,
    "attivo" BOOLEAN DEFAULT true,
    "note" TEXT,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. NUCLEO
CREATE TABLE "Nucleo" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "azienda_id" UUID NOT NULL REFERENCES "Azienda"("id") ON DELETE CASCADE,
    "nome" TEXT NOT NULL,
    "mansione" TEXT NOT NULL,
    "descrizione" TEXT,
    "colore" TEXT DEFAULT '#3b82f6',
    
    -- Configurazione Copertura
    "membri_richiesti_min" INTEGER DEFAULT 1,
    "membri_richiesti_max" INTEGER,
    
    -- Orari Specifici (opzionale, override azienda)
    "orario_specifico" JSONB,
    
    -- Politiche Quote (override default azienda, NULL = usa default)
    "ferie_annuali" INTEGER,
    "permessi_annuali" INTEGER,
    "riposi_settimanali" INTEGER,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "unique_nucleo_per_azienda" UNIQUE ("azienda_id", "nome")
);

-- 5. APPARTENENZA_NUCLEO (Many-to-Many)
CREATE TABLE "Appartenenza_Nucleo" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "collaboratore_id" UUID NOT NULL REFERENCES "Collaboratore"("id") ON DELETE CASCADE,
    "nucleo_id" UUID NOT NULL REFERENCES "Nucleo"("id") ON DELETE CASCADE,
    "data_inizio" DATE NOT NULL DEFAULT CURRENT_DATE,
    "data_fine" DATE, -- NULL = ancora attivo
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "unique_collaboratore_nucleo_attivo" UNIQUE ("collaboratore_id", "nucleo_id", "data_fine")
);

-- 6. TURNO
CREATE TABLE "Turno" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nucleo_id" UUID NOT NULL REFERENCES "Nucleo"("id") ON DELETE CASCADE,
    "data" DATE NOT NULL,
    "ora_inizio" TIME NOT NULL,
    "ora_fine" TIME NOT NULL,
    
    -- Copertura
    "num_collaboratori_richiesti" INTEGER NOT NULL DEFAULT 1,
    
    -- Stato
    "completato" BOOLEAN DEFAULT false,
    "pubblicato" BOOLEAN DEFAULT false,
    
    -- Metadati
    "note" TEXT,
    "creato_da" UUID REFERENCES "Amministratore"("id"),
    "modificato_da" UUID REFERENCES "Amministratore"("id"),
    
    -- AI (futuro)
    "suggerito_da_ai" BOOLEAN DEFAULT false,
    "ai_confidence" FLOAT,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ASSEGNAZIONE_TURNO
CREATE TABLE "Assegnazione_Turno" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "turno_id" UUID NOT NULL REFERENCES "Turno"("id") ON DELETE CASCADE,
    "collaboratore_id" UUID NOT NULL REFERENCES "Collaboratore"("id") ON DELETE CASCADE,
    
    -- Tipo Assegnazione
    "tipo" "TipoAssegnazione" DEFAULT 'manuale',
    
    -- Conferma
    "confermato" BOOLEAN DEFAULT false,
    "confermato_da" UUID REFERENCES "Amministratore"("id"),
    "confermato_il" TIMESTAMP,
    
    -- Ore (calcolate automaticamente da ora_inizio/fine del turno)
    "ore_lavorate" FLOAT,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "unique_assegnazione" UNIQUE ("turno_id", "collaboratore_id")
);

-- 8. RICHIESTA
CREATE TABLE "Richiesta" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "collaboratore_id" UUID NOT NULL REFERENCES "Collaboratore"("id") ON DELETE CASCADE,
    "tipo" "TipoRichiesta" NOT NULL,
    
    -- Date/Ore
    "data_inizio" DATE NOT NULL,
    "data_fine" DATE NOT NULL,
    "ore_richieste" INTEGER, -- per permessi orari
    
    -- Stato
    "stato" "StatoRichiesta" DEFAULT 'in_attesa',
    
    -- Revisione
    "rivista_da" UUID REFERENCES "Amministratore"("id"),
    "rivista_il" TIMESTAMP,
    "motivo_rifiuto" TEXT,
    
    -- Note
    "note_collaboratore" TEXT,
    "note_admin" TEXT,
    
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDICI
-- ============================================

CREATE INDEX "idx_azienda_email" ON "Azienda"("super_admin_email");
CREATE INDEX "idx_amministratore_azienda" ON "Amministratore"("azienda_id");
CREATE INDEX "idx_amministratore_email" ON "Amministratore"("email");
CREATE INDEX "idx_collaboratore_azienda" ON "Collaboratore"("azienda_id");
CREATE INDEX "idx_collaboratore_email" ON "Collaboratore"("email");
CREATE INDEX "idx_collaboratore_attivo" ON "Collaboratore"("azienda_id", "attivo");
CREATE INDEX "idx_nucleo_azienda" ON "Nucleo"("azienda_id");
CREATE INDEX "idx_appartenenza_collaboratore" ON "Appartenenza_Nucleo"("collaboratore_id");
CREATE INDEX "idx_appartenenza_nucleo" ON "Appartenenza_Nucleo"("nucleo_id");
CREATE INDEX "idx_turno_nucleo" ON "Turno"("nucleo_id");
CREATE INDEX "idx_turno_data" ON "Turno"("data");
CREATE INDEX "idx_turno_nucleo_data" ON "Turno"("nucleo_id", "data");
CREATE INDEX "idx_assegnazione_turno" ON "Assegnazione_Turno"("turno_id");
CREATE INDEX "idx_assegnazione_collaboratore" ON "Assegnazione_Turno"("collaboratore_id");
CREATE INDEX "idx_richiesta_collaboratore" ON "Richiesta"("collaboratore_id");
CREATE INDEX "idx_richiesta_stato" ON "Richiesta"("stato");
CREATE INDEX "idx_richiesta_date" ON "Richiesta"("data_inizio", "data_fine");

-- ============================================
-- FUNZIONI UTILITÀ
-- ============================================

-- Calcola ore mensili da settimanali (4.33 settimane/mese)
CREATE OR REPLACE FUNCTION calcola_ore_mensili(ore_sett INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN ROUND(ore_sett * 4.33);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger per aggiornare automatically ore_mensili
CREATE OR REPLACE FUNCTION update_ore_mensili()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ore_mensili := calcola_ore_mensili(NEW.ore_settimanali);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ore_mensili
BEFORE INSERT OR UPDATE OF ore_settimanali ON "Collaboratore"
FOR EACH ROW
EXECUTE FUNCTION update_ore_mensili();

-- Trigger per calcolare ore_lavorate in assegnazione
CREATE OR REPLACE FUNCTION calcola_ore_lavorate()
RETURNS TRIGGER AS $$
DECLARE
    turno_rec RECORD;
    ore_diff INTERVAL;
BEGIN
    SELECT "ora_inizio", "ora_fine" INTO turno_rec
    FROM "Turno"
    WHERE "id" = NEW.turno_id;
    
    ore_diff := turno_rec.ora_fine - turno_rec.ora_inizio;
    NEW.ore_lavorate := EXTRACT(EPOCH FROM ore_diff) / 3600;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcola_ore_lavorate
BEFORE INSERT ON "Assegnazione_Turno"
FOR EACH ROW
EXECUTE FUNCTION calcola_ore_lavorate();

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_azienda_updated_at
BEFORE UPDATE ON "Azienda"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_amministratore_updated_at
BEFORE UPDATE ON "Amministratore"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_collaboratore_updated_at
BEFORE UPDATE ON "Collaboratore"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_nucleo_updated_at
BEFORE UPDATE ON "Nucleo"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_turno_updated_at
BEFORE UPDATE ON "Turno"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_richiesta_updated_at
BEFORE UPDATE ON "Richiesta"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS su tutte le tabelle
ALTER TABLE "Azienda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Amministratore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collaboratore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Nucleo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appartenenza_Nucleo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assegnazione_Turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Richiesta" ENABLE ROW LEVEL SECURITY;

-- POLICY: Azienda
-- Super admin può vedere/modificare tutto
CREATE POLICY "super_admin_all_azienda" ON "Azienda"
FOR ALL
USING (
    super_admin_email = auth.email()
);

-- POLICY: Amministratore
-- Super admin vede tutti gli admin della sua azienda
CREATE POLICY "admin_view_propria_azienda" ON "Amministratore"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "Azienda"
        WHERE id = "Amministratore".azienda_id
        AND super_admin_email = auth.email()
    )
    OR email = auth.email()
);

-- Solo super admin può modificare amministratori
CREATE POLICY "super_admin_manage_amministratori" ON "Amministratore"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Azienda"
        WHERE id = "Amministratore".azienda_id
        AND super_admin_email = auth.email()
    )
);

-- POLICY: Collaboratore
-- Admin con permesso può gestire collaboratori
CREATE POLICY "admin_manage_collaboratori" ON "Collaboratore"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Amministratore" a
        JOIN "Azienda" az ON a.azienda_id = az.id
        WHERE az.id = "Collaboratore".azienda_id
        AND a.email = auth.email()
        AND (a.ruolo = 'super_admin' OR a.puo_modificare_collaboratori = true)
    )
);

-- Collaboratori possono vedere solo se stessi
CREATE POLICY "collaboratore_view_self" ON "Collaboratore"
FOR SELECT
USING (email = auth.email());

-- POLICY: Nucleo
-- Admin con permesso può gestire nuclei
CREATE POLICY "admin_manage_nuclei" ON "Nucleo"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Amministratore" a
        WHERE a.azienda_id = "Nucleo".azienda_id
        AND a.email = auth.email()
        AND (a.ruolo = 'super_admin' OR a.puo_modificare_nuclei = true)
    )
);

-- Collaboratori possono vedere nuclei della loro azienda
CREATE POLICY "collaboratore_view_nuclei" ON "Nucleo"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "Collaboratore" c
        WHERE c.azienda_id = "Nucleo".azienda_id
        AND c.email = auth.email()
    )
);

-- POLICY: Turno
-- Admin con permesso può gestire turni
CREATE POLICY "admin_manage_turni" ON "Turno"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Amministratore" a
        JOIN "Nucleo" n ON n.id = "Turno".nucleo_id
        WHERE a.azienda_id = n.azienda_id
        AND a.email = auth.email()
        AND (a.ruolo = 'super_admin' OR a.puo_modificare_turni = true)
    )
);

-- Collaboratori possono vedere turni dei loro nuclei
CREATE POLICY "collaboratore_view_turni_propri_nuclei" ON "Turno"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "Appartenenza_Nucleo" ap
        JOIN "Collaboratore" c ON c.id = ap.collaboratore_id
        WHERE ap.nucleo_id = "Turno".nucleo_id
        AND c.email = auth.email()
        AND (ap.data_fine IS NULL OR ap.data_fine >= CURRENT_DATE)
    )
);

-- POLICY: Richiesta
-- Admin con permesso può gestire richieste
CREATE POLICY "admin_manage_richieste" ON "Richiesta"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Amministratore" a
        JOIN "Collaboratore" c ON c.azienda_id = a.azienda_id
        WHERE c.id = "Richiesta".collaboratore_id
        AND a.email = auth.email()
        AND (
            a.ruolo = 'super_admin' 
            OR (tipo = 'ferie' AND a.puo_gestire_ferie = true)
            OR (tipo = 'permesso' AND a.puo_gestire_permessi = true)
        )
    )
);

-- Collaboratori possono gestire solo le proprie richieste
CREATE POLICY "collaboratore_manage_proprie_richieste" ON "Richiesta"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Collaboratore" c
        WHERE c.id = "Richiesta".collaboratore_id
        AND c.email = auth.email()
    )
);

-- ============================================
-- SEED SUPER ADMIN
-- ============================================

-- Inserisci azienda di default per super admin
INSERT INTO "Azienda" (
    "nome",
    "tipo_attivita",
    "tipo_orario",
    "orario_apertura",
    "super_admin_email",
    "completato_onboarding"
) VALUES (
    'La Mia Azienda',
    'ristorazione',
    'fisso',
    '{"tipo": "fisso", "inizio": "08:00", "fine": "22:00"}'::jsonb,
    'alexfratello1982@gmail.com',
    false
) ON CONFLICT DO NOTHING;

-- Inserisci super admin
INSERT INTO "Amministratore" (
    "azienda_id",
    "email",
    "nome",
    "ruolo"
) 
SELECT 
    id,
    'alexfratello1982@gmail.com',
    'Alessandro Fratello',
    'super_admin'
FROM "Azienda"
WHERE super_admin_email = 'alexfratello1982@gmail.com'
LIMIT 1
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FINE MIGRATION
-- ============================================
