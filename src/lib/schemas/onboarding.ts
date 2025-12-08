import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

// Deve corrispondere all'ENUM "TipoAttivita" nel database
export const TipoAttivitaSchema = z.enum([
    'ristorazione',
    'retail',
    'hotel',
    'ufficio',
    'sanita',
    'manifattura',
    'altro'
]);

export const TipoOrarioSchema = z.enum(['fisso', 'variabile']);

export const TipoOreContrattoSchema = z.enum([
    'settimanale_fisso',
    'mensile',
    'flessibile'
]);

// ============================================
// ORARIO SCHEMAS
// ============================================

export const OrarioGiornoSchema = z.object({
    inizio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato orario: HH:MM'),
    fine: z.string().regex(/^\d{2}:\d{2}$/, 'Formato orario: HH:MM'),
    chiuso: z.boolean().optional()
});

export const OrarioFissoSchema = z.object({
    tipo: z.literal('fisso'),
    inizio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato orario: HH:MM'),
    fine: z.string().regex(/^\d{2}:\d{2}$/, 'Formato orario: HH:MM')
});

export const OrarioVariabileSchema = z.object({
    tipo: z.literal('variabile'),
    lun: OrarioGiornoSchema.optional(),
    mar: OrarioGiornoSchema.optional(),
    mer: OrarioGiornoSchema.optional(),
    gio: OrarioGiornoSchema.optional(),
    ven: OrarioGiornoSchema.optional(),
    sab: OrarioGiornoSchema.optional(),
    dom: OrarioGiornoSchema.optional()
});

export const OrarioAperturaSchema = z.discriminatedUnion('tipo', [
    OrarioFissoSchema,
    OrarioVariabileSchema
]);

// ============================================
// NUCLEO SCHEMA
// ============================================

export const NucleoOnboardingSchema = z.object({
    nome: z.string().min(1, 'Nome nucleo richiesto'),
    mansione: z.string().optional().default('Generale'),
    colore: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#3b82f6'),
    descrizione: z.string().optional()
});

// ============================================
// ORE CONFIGURAZIONE SCHEMA
// ============================================

export const ConfigurazioneOreSchema = z.object({
    tipo: TipoOreContrattoSchema,
    valore: z.number().min(1).max(60).optional(),
    min: z.number().min(1).max(60).optional(),
    max: z.number().min(1).max(60).optional()
}).refine(data => {
    if (data.tipo === 'settimanale_fisso') {
        return data.valore !== undefined && data.valore > 0;
    }
    if (data.tipo === 'mensile') {
        return data.valore !== undefined && data.valore > 0;
    }
    if (data.tipo === 'flessibile') {
        return data.min !== undefined && data.max !== undefined && data.min < data.max;
    }
    return true;
}, {
    message: 'Configurazione ore non valida per il tipo selezionato'
});

// ============================================
// ONBOARDING DATA SCHEMA (Completo)
// ============================================

export const OnboardingDataSchema = z.object({
    // Informazioni Azienda
    nomeAzienda: z.string()
        .min(2, 'Nome azienda troppo corto')
        .max(100, 'Nome azienda troppo lungo')
        .describe("Il nome dell'azienda"),

    tipoAttivita: TipoAttivitaSchema
        .describe("Il tipo di attività (es. ristorazione, retail, ufficio)"),

    // Orari di Apertura
    orarioApertura: OrarioAperturaSchema
        .describe("Gli orari di apertura dell'azienda"),

    // Collaboratori
    numeroCollaboratori: z.number()
        .int()
        .min(1, 'Almeno 1 collaboratore')
        .max(1000, 'Massimo 1000 collaboratori')
        .describe("Il numero approssimativo di collaboratori"),

    // Nuclei/Reparti
    nuclei: z.array(NucleoOnboardingSchema)
        .min(1, 'Almeno 1 nucleo richiesto')
        .max(20, 'Massimo 20 nuclei')
        .describe("I nuclei/reparti dell'azienda (es. Cucina, Sala, Bar)"),

    // Configurazione Ore
    configurazioneOre: ConfigurazioneOreSchema
        .describe("Come gestire le ore dei collaboratori"),

    // Note opzionali
    note: z.string()
        .max(500, 'Note troppo lunghe')
        .optional()
        .describe("Eventuali note o richieste specifiche")
});

// ============================================
// PARTIAL SCHEMAS (per estrazione progressiva)
// ============================================

export const OnboardingPartialSchema = OnboardingDataSchema.partial();

// Schema per singoli step dell'onboarding
export const Step1Schema = OnboardingDataSchema.pick({
    nomeAzienda: true,
    tipoAttivita: true
});

export const Step2Schema = OnboardingDataSchema.pick({
    orarioApertura: true
});

export const Step3Schema = OnboardingDataSchema.pick({
    numeroCollaboratori: true,
    configurazioneOre: true
});

export const Step4Schema = OnboardingDataSchema.pick({
    nuclei: true
});

// ============================================
// EXPORT TYPES
// ============================================

export type TipoAttivita = z.infer<typeof TipoAttivitaSchema>;
export type TipoOrario = z.infer<typeof TipoOrarioSchema>;
export type TipoOreContratto = z.infer<typeof TipoOreContrattoSchema>;
export type OrarioGiorno = z.infer<typeof OrarioGiornoSchema>;
export type OrarioFisso = z.infer<typeof OrarioFissoSchema>;
export type OrarioVariabile = z.infer<typeof OrarioVariabileSchema>;
export type OrarioApertura = z.infer<typeof OrarioAperturaSchema>;
export type NucleoOnboarding = z.infer<typeof NucleoOnboardingSchema>;
export type ConfigurazioneOre = z.infer<typeof ConfigurazioneOreSchema>;
export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
export type OnboardingPartial = z.infer<typeof OnboardingPartialSchema>;

// ============================================
// HELPERS
// ============================================

export const TIPI_ATTIVITA_LABELS: Record<TipoAttivita, string> = {
    ristorazione: 'Ristorazione',
    retail: 'Vendita al dettaglio',
    hotel: 'Hotel / Ospitalità',
    ufficio: 'Ufficio',
    sanita: 'Sanità',
    manifattura: 'Manifattura',
    altro: 'Altro'
};

export const TIPI_ORE_LABELS: Record<TipoOreContratto, string> = {
    settimanale_fisso: 'Ore settimanali fisse',
    mensile: 'Ore mensili',
    flessibile: 'Ore flessibili (min/max)'
};

export const COLORI_DEFAULT = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#22c55e', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
];

// ============================================
// LEGACY SCHEMA (per compatibilità)
// ============================================

export const CompanyOnboardingSchema = OnboardingDataSchema;
export type CompanyOnboardingData = OnboardingData;
