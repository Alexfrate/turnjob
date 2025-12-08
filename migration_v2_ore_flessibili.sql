-- ============================================
-- TURNJOB - MIGRATION V2
-- Ore Flessibili + Sessione Onboarding
-- ============================================

-- Estendi enum TipoAttivita con nuovi valori
ALTER TYPE "TipoAttivita" ADD VALUE IF NOT EXISTS 'ufficio';
ALTER TYPE "TipoAttivita" ADD VALUE IF NOT EXISTS 'sanita';
ALTER TYPE "TipoAttivita" ADD VALUE IF NOT EXISTS 'manifattura';

-- Nuovo enum per tipo configurazione ore
DO $$ BEGIN
    CREATE TYPE "TipoOreContratto" AS ENUM (
        'settimanale_fisso',  -- Es: 40 ore/settimana
        'mensile',            -- Es: 160 ore/mese
        'flessibile'          -- Es: min 20, max 40 ore/settimana
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Aggiungi colonne ore flessibili a Collaboratore
ALTER TABLE "Collaboratore"
ADD COLUMN IF NOT EXISTS "tipo_ore" "TipoOreContratto" DEFAULT 'settimanale_fisso';

ALTER TABLE "Collaboratore"
ADD COLUMN IF NOT EXISTS "ore_min" INTEGER;

ALTER TABLE "Collaboratore"
ADD COLUMN IF NOT EXISTS "ore_max" INTEGER;

-- Rendi ore_settimanali nullable per supportare tipo mensile/flessibile
ALTER TABLE "Collaboratore"
ALTER COLUMN "ore_settimanali" DROP NOT NULL;

-- Aggiungi colonna step onboarding ad Azienda
ALTER TABLE "Azienda"
ADD COLUMN IF NOT EXISTS "step_onboarding" INTEGER DEFAULT 0;

-- Aggiungi colonna dati_onboarding ad Azienda (per dati estratti da AI)
ALTER TABLE "Azienda"
ADD COLUMN IF NOT EXISTS "dati_onboarding" JSONB;

-- Aggiungi colonna auth_id a Amministratore (link a Supabase Auth)
ALTER TABLE "Amministratore"
ADD COLUMN IF NOT EXISTS "auth_id" UUID UNIQUE;

-- Crea tabella Sessione_Onboarding
CREATE TABLE IF NOT EXISTS "Sessione_Onboarding" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "azienda_id" UUID NOT NULL REFERENCES "Azienda"("id") ON DELETE CASCADE,
    "messaggi" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "dati_estratti" JSONB,
    "step_corrente" INTEGER DEFAULT 0,
    "completato" BOOLEAN DEFAULT false,
    "completato_il" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice per Sessione_Onboarding
CREATE INDEX IF NOT EXISTS "idx_sessione_azienda" ON "Sessione_Onboarding"("azienda_id");

-- Trigger updated_at per Sessione_Onboarding
DROP TRIGGER IF EXISTS trigger_sessione_updated_at ON "Sessione_Onboarding";
CREATE TRIGGER trigger_sessione_updated_at
BEFORE UPDATE ON "Sessione_Onboarding"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- RLS per Sessione_Onboarding
ALTER TABLE "Sessione_Onboarding" ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admin_manage_sessioni" ON "Sessione_Onboarding"
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "Amministratore" a
        WHERE a.azienda_id = "Sessione_Onboarding".azienda_id
        AND a.email = auth.email()
        AND a.ruolo = 'super_admin'
    )
);

-- Aggiorna trigger ore mensili per supportare nuovi tipi
CREATE OR REPLACE FUNCTION update_ore_mensili()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo calcola ore_mensili se tipo è settimanale_fisso e ore_settimanali è presente
    IF NEW.tipo_ore = 'settimanale_fisso' AND NEW.ore_settimanali IS NOT NULL THEN
        NEW.ore_mensili := ROUND(NEW.ore_settimanali * 4.33);
    ELSIF NEW.tipo_ore = 'flessibile' AND NEW.ore_min IS NOT NULL AND NEW.ore_max IS NOT NULL THEN
        -- Per flessibile, calcola media
        NEW.ore_mensili := ROUND(((NEW.ore_min + NEW.ore_max) / 2.0) * 4.33);
    END IF;
    -- Per tipo mensile, ore_mensili viene impostato direttamente dall'utente
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ricrea trigger
DROP TRIGGER IF EXISTS trigger_update_ore_mensili ON "Collaboratore";
CREATE TRIGGER trigger_update_ore_mensili
BEFORE INSERT OR UPDATE OF ore_settimanali, tipo_ore, ore_min, ore_max ON "Collaboratore"
FOR EACH ROW
EXECUTE FUNCTION update_ore_mensili();

-- Aggiungi icona a Nucleo
ALTER TABLE "Nucleo"
ADD COLUMN IF NOT EXISTS "icona" TEXT DEFAULT 'users';

-- Aggiungi ordine a Nucleo (per UI)
ALTER TABLE "Nucleo"
ADD COLUMN IF NOT EXISTS "ordine" INTEGER DEFAULT 0;

-- Aggiungi attivo a Nucleo (soft delete)
ALTER TABLE "Nucleo"
ADD COLUMN IF NOT EXISTS "attivo" BOOLEAN DEFAULT true;

-- ============================================
-- FINE MIGRATION V2
-- ============================================
