// ============================================
// TURNJOB - Tipi TypeScript Database Italiano
// ============================================

// ============================================
// ENUM TYPES (corrispondono agli ENUM nel DB)
// ============================================

export type TipoAttivita = 'ristorazione' | 'retail' | 'hotel' | 'altro';

export type TipoOrario = 'fisso' | 'variabile';

export type RuoloAmministratore = 'super_admin' | 'admin' | 'manager';

export type TipoContratto = 'full_time' | 'part_time' | 'altro';

export type TipoOreContratto = 'settimanale_fisso' | 'mensile' | 'flessibile';

export type TipoRichiesta = 'ferie' | 'permesso' | 'riposo';

export type StatoRichiesta = 'in_attesa' | 'approvata' | 'rifiutata' | 'cancellata';

export type TipoAssegnazione = 'manuale' | 'richiesta_collaboratore' | 'suggerita_ai';

// ============================================
// ORARIO TYPES
// ============================================

export interface OrarioFisso {
    tipo: 'fisso';
    inizio: string; // "08:00"
    fine: string;   // "22:00"
}

export interface OrarioGiorno {
    inizio: string;
    fine: string;
    chiuso?: boolean;
}

export interface OrarioVariabile {
    tipo: 'variabile';
    lun?: OrarioGiorno;
    mar?: OrarioGiorno;
    mer?: OrarioGiorno;
    gio?: OrarioGiorno;
    ven?: OrarioGiorno;
    sab?: OrarioGiorno;
    dom?: OrarioGiorno;
}

export type OrarioApertura = OrarioFisso | OrarioVariabile;

// ============================================
// DATABASE TYPES
// ============================================

export interface Azienda {
    id: string;
    nome: string;
    tipo_attivita: TipoAttivita;
    tipo_orario: TipoOrario;
    orario_apertura: OrarioApertura;
    super_admin_email: string;
    completato_onboarding: boolean;
    ferie_annuali_default: number;
    permessi_annuali_default: number;
    riposi_settimanali_default: number;
    created_at: string;
    updated_at: string;
}

export interface Amministratore {
    id: string;
    azienda_id: string;
    email: string;
    nome: string;
    ruolo: RuoloAmministratore;
    puo_modificare_orari: boolean;
    puo_modificare_collaboratori: boolean;
    puo_modificare_turni: boolean;
    puo_gestire_ferie: boolean;
    puo_gestire_permessi: boolean;
    puo_modificare_nuclei: boolean;
    created_at: string;
    updated_at: string;
}

export interface Collaboratore {
    id: string;
    azienda_id: string;
    nome: string;
    cognome: string;
    email: string;
    telefono?: string;
    ore_settimanali?: number;
    ore_mensili?: number;
    tipo_contratto: TipoContratto;
    tipo_ore: TipoOreContratto;
    ore_min?: number;
    ore_max?: number;
    ferie_annuali_custom?: number;
    permessi_annuali_custom?: number;
    riposi_settimanali_custom?: number;
    data_assunzione?: string;
    attivo: boolean;
    note?: string;
    created_at: string;
    updated_at: string;
}

export interface Nucleo {
    id: string;
    azienda_id: string;
    nome: string;
    mansione: string;
    descrizione?: string;
    colore: string;
    membri_richiesti_min: number;
    membri_richiesti_max?: number;
    orario_specifico?: OrarioApertura;
    ferie_annuali?: number;
    permessi_annuali?: number;
    riposi_settimanali?: number;
    created_at: string;
    updated_at: string;
}

export interface Appartenenza_Nucleo {
    id: string;
    collaboratore_id: string;
    nucleo_id: string;
    data_inizio: string;
    data_fine?: string;
    created_at: string;
}

export interface Turno {
    id: string;
    nucleo_id: string;
    data: string;
    ora_inizio: string;
    ora_fine: string;
    num_collaboratori_richiesti: number;
    completato: boolean;
    pubblicato: boolean;
    note?: string;
    creato_da?: string;
    modificato_da?: string;
    suggerito_da_ai: boolean;
    ai_confidence?: number;
    created_at: string;
    updated_at: string;
}

export interface Assegnazione_Turno {
    id: string;
    turno_id: string;
    collaboratore_id: string;
    tipo: TipoAssegnazione;
    confermato: boolean;
    confermato_da?: string;
    confermato_il?: string;
    ore_lavorate?: number;
    created_at: string;
}

export interface Richiesta {
    id: string;
    collaboratore_id: string;
    tipo: TipoRichiesta;
    data_inizio: string;
    data_fine: string;
    ore_richieste?: number;
    stato: StatoRichiesta;
    rivista_da?: string;
    rivista_il?: string;
    motivo_rifiuto?: string;
    note_collaboratore?: string;
    note_admin?: string;
    created_at: string;
    updated_at: string;
}

// ============================================
// INSERT TYPES (per creazione)
// ============================================

export type AziendaInsert = Omit<Azienda, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
};

export type AziendaUpdate = Partial<Omit<Azienda, 'id' | 'created_at' | 'updated_at'>>;

export type AmministratoreInsert = Omit<Amministratore, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
};

export type AmministratoreUpdate = Partial<Omit<Amministratore, 'id' | 'azienda_id' | 'created_at' | 'updated_at'>>;

export type CollaboratoreInsert = Omit<Collaboratore, 'id' | 'created_at' | 'updated_at' | 'ore_mensili'> & {
    id?: string;
};

export type CollaboratoreUpdate = Partial<Omit<Collaboratore, 'id' | 'azienda_id' | 'created_at' | 'updated_at' | 'ore_mensili'>>;

export type NucleoInsert = Omit<Nucleo, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
};

export type NucleoUpdate = Partial<Omit<Nucleo, 'id' | 'azienda_id' | 'created_at' | 'updated_at'>>;

export type TurnoInsert = Omit<Turno, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
};

export type TurnoUpdate = Partial<Omit<Turno, 'id' | 'nucleo_id' | 'created_at' | 'updated_at'>>;

export type RichiestaInsert = Omit<Richiesta, 'id' | 'created_at' | 'updated_at' | 'stato'> & {
    id?: string;
    stato?: StatoRichiesta;
};

export type RichiestaUpdate = Partial<Omit<Richiesta, 'id' | 'collaboratore_id' | 'created_at' | 'updated_at'>>;

// ============================================
// TYPES WITH RELATIONS
// ============================================

export interface CollaboratoreConNuclei extends Collaboratore {
    Appartenenza_Nucleo?: (Appartenenza_Nucleo & { Nucleo: Nucleo })[];
}

export interface NucleoConMembri extends Nucleo {
    Appartenenza_Nucleo?: (Appartenenza_Nucleo & { Collaboratore: Collaboratore })[];
}

export interface TurnoConAssegnazioni extends Turno {
    Assegnazione_Turno?: (Assegnazione_Turno & { Collaboratore: Collaboratore })[];
    Nucleo?: Nucleo;
}

export interface RichiestaConCollaboratore extends Richiesta {
    Collaboratore?: Collaboratore;
}

// ============================================
// ONBOARDING TYPES
// ============================================

export interface OnboardingData {
    nomeAzienda: string;
    tipoAttivita: TipoAttivita;
    orarioApertura: OrarioApertura;
    numeroCollaboratori: number;
    nuclei: Array<{
        nome: string;
        mansione: string;
        colore?: string;
        descrizione?: string;
    }>;
    configurazioneOre: {
        tipo: TipoOreContratto;
        valore?: number;
        min?: number;
        max?: number;
    };
    note?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
    success?: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============================================
// HELPER TYPES
// ============================================

export type WithId<T> = T & { id: string };

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
