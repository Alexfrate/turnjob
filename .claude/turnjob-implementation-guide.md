# Turnjob - Guida Implementazione Completa per Claude Code

## 🎯 Overview del Progetto

Turnjob è una SaaS platform per gestione turni lavorativi con AI conversazionale che differenzia l'app da tutti i competitor (Deputy, Homebase, 7shifts, When I Work) che non offrono onboarding conversazionale.

**Stack Tecnologico:**
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: Supabase (PostgreSQL), Prisma ORM
- AI: OpenRouter (unified API gateway) + LLM Router configurabile (xAI Grok, OpenAI, Anthropic, Google Gemini)
- Ottimizzazione: highs-js (MILP solver)
- Background Jobs: Inngest
- Internazionalizzazione: next-intl
- Testing: Playwright
- MCP: Vercel MCP per deployment management

**Caratteristiche Distintive:**
- ✨ AI conversazionale per onboarding (UNICO nel mercato)
- 🔄 Modalità dual-mode: AI-assisted O manuale (scelta utente)
- 🌍 Multilingua (Italiano + Inglese, espandibile)
- 📱 Mobile-first design (60%+ usage previsto)
- 🇮🇹 CCNL compliance automatizzato (mercato italiano)
- 💰 LLM Router configurabile da admin
- ⚡ Generazione turni ottimizzati <30 secondi

---

## 📋 Pre-requisiti e Setup Iniziale

### Stato Attuale Progetto
✅ **GIÀ CONFIGURATO:**
- Supabase account e database connesso
- Schema database base (Company, User, Position tables)
- Progetto Next.js inizializzato

❌ **DA CONFIGURARE:**
- API Keys LLM providers (chiedi man mano che servono)
- Inngest account e configurazione
- Playwright setup
- MCP Vercel integration
- Sistema i18n completo

### Credenziali e Account da Richiedere (quando necessario)

**Claude Code deve chiedere questi dati SOLO quando arriva allo step specifico:**

```
STEP 1 (Schema Database): ❌ Nessuna credenziale necessaria
STEP 2 (i18n Setup): ❌ Nessuna credenziale necessaria
STEP 3 (Auth): ✅ Supabase già configurato
STEP 4 (LLM Router via OpenRouter):
  ⚠️ CHIEDERE: OpenRouter API Key (https://openrouter.ai/keys)
  ℹ️ OpenRouter fornisce accesso unificato a xAI Grok, OpenAI, Anthropic, Google Gemini
STEP 5 (Inngest):
  ⚠️ CHIEDERE: Inngest Account (https://inngest.com)
  ⚠️ CHIEDERE: Inngest Event Key
STEP 6 (Vercel MCP):
  ⚠️ CHIEDERE: Vercel Access Token
STEP 7 (Playwright): ❌ Nessuna credenziale necessaria
```

**IMPORTANTE:** Claude Code NON deve chiedere tutte le credenziali all'inizio. Chiedi SOLO quando arrivi allo step che le richiede.

---

## 🏗️ Architettura Progetto

```
/turnjob
├── /app
│   ├── /[locale]                 # i18n routing
│   │   ├── /(auth)
│   │   │   ├── /login
│   │   │   └── /register
│   │   ├── /(onboarding)
│   │   │   ├── /welcome          # Scelta AI vs Manual
│   │   │   ├── /ai               # Onboarding conversazionale
│   │   │   └── /manual           # Onboarding form tradizionale
│   │   ├── /(dashboard)
│   │   │   ├── /dashboard
│   │   │   ├── /calendar
│   │   │   ├── /requests
│   │   │   ├── /team
│   │   │   ├── /schedule
│   │   │   └── /settings
│   │   └── /(admin)
│   │       ├── /admin/llm-config # Configurazione LLM Router
│   │       ├── /admin/analytics
│   │       └── /admin/companies
│   └── /api
│       ├── /auth
│       ├── /onboarding
│       ├── /schedule
│       ├── /llm
│       └── /inngest
├── /components
│   ├── /ui                       # shadcn/ui components
│   ├── /onboarding
│   ├── /calendar
│   ├── /schedule
│   └── /admin
├── /lib
│   ├── /ai
│   │   ├── router.ts             # LLM Router centrale
│   │   ├── openrouter.ts         # OpenRouter client wrapper
│   │   └── /prompts
│   ├── /db                       # Prisma client
│   ├── /optimization
│   │   └── solver.ts             # highs-js integration
│   ├── /inngest
│   │   ├── client.ts
│   │   └── /functions
│   └── /utils
├── /messages                     # i18n translations
│   ├── /it.json
│   └── /en.json
├── /prisma
│   └── schema.prisma
├── /tests                        # Playwright tests
│   ├── /e2e
│   └── /mobile
├── middleware.ts                 # i18n + auth
├── i18n.ts
└── next.config.js
```

---

## 📱 Mobile-First Guidelines (APPLICARE SEMPRE)

**Principi Fondamentali:**

1. **Breakpoints Standard Tailwind:**
```css
/* Mobile First (default): 0px - 639px */
.class { /* mobile styles */ }

/* Tablet: 640px+ */
@media (min-width: 640px) { .sm:class }

/* Desktop Small: 768px+ */
@media (min-width: 768px) { .md:class }

/* Desktop: 1024px+ */
@media (min-width: 1024px) { .lg:class }
```

2. **Touch Targets Minimi:**
- Tutti i bottoni/link: min 44x44px (iOS) o 48x48px (Android)
- Spacing tra elementi interattivi: min 8px

3. **Typography Responsive:**
```typescript
// Usa scale modulare
text-sm   // 14px mobile
text-base // 16px mobile
text-lg   // 18px mobile
md:text-lg  // 18px tablet
md:text-xl  // 20px tablet
```

4. **Navigation Mobile:**
- Hamburger menu su mobile (<768px)
- Bottom navigation per azioni principali
- Swipe gestures dove appropriato

5. **Forms Mobile-Optimized:**
- Input type corretto (`tel`, `email`, `number`)
- Labels sempre visibili
- Error messages chiari e vicini al campo
- Auto-focus progressivo

6. **Testing Mobile:**
- Playwright mobile viewport tests OBBLIGATORI
- Test su iOS Safari e Chrome Android
- Performance mobile (<3s LCP)

**ESEMPIO COMPONENTE MOBILE-FIRST:**
```typescript
export function ScheduleCard({ schedule }: Props) {
  return (
    <div className="
      flex flex-col gap-3 p-4
      sm:flex-row sm:items-center sm:gap-4 sm:p-6
      md:gap-6
    ">
      <div className="flex-1">
        <h3 className="text-base font-semibold md:text-lg">
          {schedule.name}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {schedule.description}
        </p>
      </div>
      
      {/* Mobile: bottoni stack, Desktop: inline */}
      <div className="
        flex flex-col gap-2 w-full
        sm:flex-row sm:w-auto
      ">
        <Button size="sm" className="w-full sm:w-auto">
          Modifica
        </Button>
        <Button size="sm" variant="outline" className="w-full sm:w-auto">
          Duplica
        </Button>
      </div>
    </div>
  );
}
```

---

## 🌍 Sistema Internazionalizzazione (i18n)

### Setup next-intl

**1. Installazione:**
```bash
npm install next-intl
```

**2. Configurazione i18n.ts:**
```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'it';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
```

**3. Middleware per routing:**
```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always' // /it/dashboard, /en/dashboard
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
```

**4. Layout con LocaleProvider:**
```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return [{ locale: 'it' }, { locale: 'en' }];
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**5. Utilizzo in Componenti:**
```typescript
'use client';
import { useTranslations } from 'next-intl';

export function WelcomeMessage() {
  const t = useTranslations('onboarding');
  
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.description')}</p>
    </div>
  );
}
```

**6. Struttura File Traduzioni:**
```json
// messages/it.json
{
  "common": {
    "save": "Salva",
    "cancel": "Annulla",
    "loading": "Caricamento...",
    "error": "Errore"
  },
  "onboarding": {
    "welcome": {
      "title": "Benvenuto in Turnjob",
      "description": "Configura la tua azienda in pochi minuti"
    },
    "mode": {
      "ai": "Setup Guidato AI",
      "manual": "Setup Manuale"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "stats": {
      "pendingRequests": "Richieste in Attesa",
      "activeEmployees": "Dipendenti Attivi"
    }
  }
}

// messages/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "Error"
  },
  "onboarding": {
    "welcome": {
      "title": "Welcome to Turnjob",
      "description": "Set up your company in minutes"
    },
    "mode": {
      "ai": "AI-Guided Setup",
      "manual": "Manual Setup"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "stats": {
      "pendingRequests": "Pending Requests",
      "activeEmployees": "Active Employees"
    }
  }
}
```

**7. Language Switcher Component:**
```typescript
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const switchLocale = (newLocale: string) => {
    const currentPath = pathname.replace(`/${locale}`, '');
    router.push(`/${newLocale}${currentPath}`);
  };
  
  return (
    <div className="flex gap-2">
      <Button
        variant={locale === 'it' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => switchLocale('it')}
      >
        🇮🇹 IT
      </Button>
      <Button
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => switchLocale('en')}
      >
        🇬🇧 EN
      </Button>
    </div>
  );
}
```

---

## 🗄️ Database Schema Completo (Prisma)

**NOTA:** Questo schema estende quello esistente. Claude Code deve fare migration incrementali.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  ADMIN
  MANAGER
  EMPLOYEE
}

enum RequestType {
  VACATION
  PERMISSION
  DAY_OFF
  ROL
  SICK_LEAVE
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum OnboardingMode {
  MANUAL
  AI_ASSISTED
  HYBRID
}

enum ScheduleGenerationType {
  AI_GENERATED
  MANUAL
  HYBRID
}

enum ScheduleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// ============================================
// CORE ENTITIES
// ============================================

model Company {
  id                    String      @id @default(uuid())
  name                  String
  email                 String      @unique
  logo                  String?
  industry              String      // "restaurant", "retail", "hospitality"
  
  // Onboarding
  preferredOnboardingMode OnboardingMode @default(MANUAL)
  hasCompletedOnboarding  Boolean    @default(false)
  onboardingStep          Int        @default(0)
  aiOnboardingData        Json?      // Conversazione + vincoli estratti
  
  // Business Rules (JSONB per flessibilità)
  businessRules         Json        @default("{}")
  // Esempio struttura:
  // {
  //   "workingHours": { "start": "09:00", "end": "18:00" },
  //   "peakPeriods": ["12:00-14:00", "19:00-22:00"],
  //   "breakRules": { "minBreak": 30, "maxConsecutiveHours": 6 }
  // }
  
  // Settings
  settings              Json        @default("{}")
  timezone              String      @default("Europe/Rome")
  locale                String      @default("it")
  
  // Relationships
  users                 User[]
  positions             Position[]
  schedules             Schedule[]
  constraints           Constraint[]
  timeOffPolicies       TimeOffPolicy[]
  blackoutPeriods       BlackoutPeriod[]
  onboardingSessions    OnboardingSession[]
  llmConfiguration      LlmConfiguration?
  
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  @@index([email])
}

model User {
  id                String      @id @default(uuid())
  email             String      @unique
  name              String
  avatar            String?
  phone             String?
  role              UserRole    @default(EMPLOYEE)
  
  companyId         String
  company           Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  positionId        String?
  position          Position?   @relation(fields: [positionId], references: [id])
  
  // Employment details
  hireDate          DateTime?
  employmentType    String?     // "full_time", "part_time", "contractor"
  isActive          Boolean     @default(true)
  
  // Availability & Preferences (JSONB)
  availability      Json?       // Weekly patterns, recurring unavailability
  preferences       Json?       // Shift preferences, colleagues, days off
  
  // Custom quota overrides (null = use policy defaults)
  customVacationDays    Int?
  customPermissionHours Int?
  customRolHours        Int?
  
  // Skills
  skills            EmployeeSkill[]
  
  // Relationships
  requests          Request[]
  shiftAssignments  ShiftAssignment[]
  
  // Auth
  passwordHash      String?     // Se usi Supabase Auth, potrebbe non servire
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@index([companyId])
  @@index([positionId])
  @@index([email])
}

model Position {
  id                    String      @id @default(uuid())
  name                  String      // "Cameriere", "Cuoco", "Barista"
  description           String?
  color                 String      @default("#3b82f6")
  
  companyId             String
  company               Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Scheduling constraints
  maxSimultaneousAbsences Int       @default(1)
  minStaffPerShift        Int       @default(1)
  
  // Required skills for position
  requiredSkillIds      String[]    // Array of skill IDs
  
  users                 User[]
  
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  @@unique([companyId, name])
  @@index([companyId])
}

model Skill {
  id              String          @id @default(uuid())
  name            String          // "Barista", "Sommelier", "First Aid"
  category        String?         // "technical", "certification", "soft_skill"
  
  employees       EmployeeSkill[]
  
  createdAt       DateTime        @default(now())
  
  @@unique([name])
}

model EmployeeSkill {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  skillId         String
  skill           Skill     @relation(fields: [skillId], references: [id], onDelete: Cascade)
  
  proficiency     Int       @default(1) // 1-5 scale
  certifiedAt     DateTime?
  expiresAt       DateTime?
  
  @@unique([userId, skillId])
}

// ============================================
// SCHEDULING
// ============================================

model Schedule {
  id              String          @id @default(uuid())
  name            String
  
  companyId       String
  company         Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  startDate       DateTime
  endDate         DateTime
  
  generationType  ScheduleGenerationType @default(MANUAL)
  status          ScheduleStatus  @default(DRAFT)
  
  // AI metadata
  aiMetadata      Json?           // Model version, confidence, parameters
  // {
  //   "modelUsed": "grok-beta",
  //   "avgConfidence": 0.87,
  //   "generationTimeMs": 12340,
  //   "constraints": {...}
  // }
  
  // Version control
  parentId        String?
  parent          Schedule?       @relation("ScheduleVersions", fields: [parentId], references: [id])
  versions        Schedule[]      @relation("ScheduleVersions")
  version         Int             @default(1)
  
  shifts          Shift[]
  auditLogs       ScheduleAuditLog[]
  
  publishedAt     DateTime?
  publishedBy     String?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@index([companyId])
  @@index([startDate, endDate])
  @@index([status])
}

model Shift {
  id                String          @id @default(uuid())
  
  scheduleId        String
  schedule          Schedule        @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  
  date              DateTime
  startTime         String          // "09:00"
  endTime           String          // "17:00"
  
  positionId        String?
  requiredRole      String?         // "cameriere", "cuoco"
  
  minStaff          Int             @default(1)
  maxStaff          Int?
  
  // AI flags
  isAiGenerated     Boolean         @default(false)
  isManuallyEdited  Boolean         @default(false)
  aiConfidence      Float?          // 0-1
  aiReasoning       String?         @db.Text // Spiegazione AI
  
  // Break requirements
  breakMinutes      Int?
  
  assignments       ShiftAssignment[]
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@index([scheduleId])
  @@index([date])
}

model ShiftAssignment {
  id              String    @id @default(uuid())
  
  shiftId         String
  shift           Shift     @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  assignmentType  String    // "AI_SUGGESTED", "MANUAL_OVERRIDE", "EMPLOYEE_REQUESTED"
  confidenceScore Float?    // 0-1 for AI assignments
  
  isConfirmed     Boolean   @default(false)
  confirmedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([shiftId, userId])
  @@index([userId])
}

// ============================================
// REQUESTS (Ferie, Permessi)
// ============================================

model Request {
  id                String          @id @default(uuid())
  
  userId            String
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type              RequestType
  status            RequestStatus   @default(PENDING)
  
  startDate         DateTime
  endDate           DateTime
  
  hours             Float?          // Per permessi in ore
  notes             String?         @db.Text
  
  // Admin review
  reviewedBy        String?
  reviewedAt        DateTime?
  adminNotes        String?         @db.Text
  rejectedReason    String?         @db.Text
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([startDate, endDate])
}

model TimeOffPolicy {
  id                    String      @id @default(uuid())
  
  companyId             String
  company               Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  year                  Int
  
  // Default quotas
  vacationDays          Int         @default(22)
  permissionHours       Int         @default(72)
  rolHours              Int         @default(0)
  
  // Weekly day off config
  weeklyDaysOffMin      Int         @default(2)
  weeklyDaysOffMax      Int         @default(3)
  
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  @@unique([companyId, year])
  @@index([companyId])
}

// ============================================
// CONSTRAINTS
// ============================================

model Constraint {
  id          String      @id @default(uuid())
  
  companyId   String
  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  type        String      // "HARD", "SOFT"
  category    String      // "AVAILABILITY", "SKILLS", "WORKLOAD", "LEGAL"
  name        String
  description String?     @db.Text
  
  // Flexible constraint definition (JSONB)
  rules       Json
  // Esempio:
  // {
  //   "condition": "employee.weeklyHours <= 40",
  //   "penalty": 100,
  //   "priority": "high"
  // }
  
  priority    Int         @default(1) // Per soft constraints weighting
  isActive    Boolean     @default(true)
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([companyId])
  @@index([category])
}

model BlackoutPeriod {
  id                String      @id @default(uuid())
  
  companyId         String
  company           Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name              String      // "Festività Natalizie", "Alta Stagione"
  description       String?     @db.Text
  
  startDate         DateTime
  endDate           DateTime
  
  blockAllRequests  Boolean     @default(false)
  maxRequestsAllowed Int?       // Se non blockAll, limite richieste
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@index([companyId])
  @@index([startDate, endDate])
}

// ============================================
// ONBOARDING
// ============================================

model OnboardingSession {
  id              String      @id @default(uuid())
  
  companyId       String
  company         Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  mode            OnboardingMode
  
  // AI conversation log
  conversationLog Json[]      // Array di {role: "user"|"assistant", content: string}
  extractedData   Json?       // Vincoli estratti progressivamente
  
  currentStep     Int         @default(0)
  totalSteps      Int         @default(5)
  
  isCompleted     Boolean     @default(false)
  completedAt     DateTime?
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@index([companyId])
}

// ============================================
// LLM MANAGEMENT
// ============================================

model LlmProvider {
  id          String      @id @default(uuid())
  name        String      @unique // "xai", "openai", "anthropic"
  displayName String      // "xAI (Grok)", "OpenAI", "Anthropic"
  
  isActive    Boolean     @default(true)
  apiKey      String?     @db.Text // Encrypted
  
  models      LlmModel[]
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model LlmModel {
  id              String      @id @default(uuid())
  
  providerId      String
  provider        LlmProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  modelId         String      // "grok-beta", "gpt-4o", "claude-sonnet-4-5"
  displayName     String
  
  // Pricing per 1M tokens
  inputCostPer1M  Float
  outputCostPer1M Float
  
  // Capabilities
  supportsStreaming   Boolean @default(true)
  supportsStructured  Boolean @default(true)
  maxTokens          Int     @default(4096)
  
  isActive        Boolean @default(true)
  priority        Int     @default(0) // Fallback ordering
  
  usageLogs       AiGenerationLog[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([providerId, modelId])
}

model LlmConfiguration {
  id                    String   @id @default(uuid())
  
  companyId             String?  @unique // Null = global default
  
  // Model assignments per use case
  onboardingModelId     String
  constraintModelId     String
  explanationModelId    String
  validationModelId     String
  
  // Fallback
  enableFallback        Boolean @default(true)
  fallbackModelIds      String[] // Array di model IDs
  
  // Cost controls
  dailyBudgetLimit      Float?
  monthlyBudgetLimit    Float?
  alertThreshold        Float   @default(0.8)
  
  // Performance
  maxRetries            Int     @default(3)
  timeoutSeconds        Int     @default(30)
  enableCaching         Boolean @default(true)
  cacheRetentionHours   Int     @default(24)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model AiGenerationLog {
  id              String    @id @default(uuid())
  
  companyId       String
  modelId         String
  model           LlmModel  @relation(fields: [modelId], references: [id])
  
  useCase         String    // "onboarding", "constraint_extraction"
  
  inputTokens     Int
  outputTokens    Int
  totalCost       Float     // In €
  
  latencyMs       Int
  wasSuccessful   Boolean
  errorMessage    String?   @db.Text
  
  metadata        Json?
  
  createdAt       DateTime  @default(now())
  
  @@index([companyId, createdAt])
  @@index([modelId, createdAt])
}

// ============================================
// AUDIT & TRACKING
// ============================================

model ScheduleAuditLog {
  id              String      @id @default(uuid())
  
  scheduleId      String
  schedule        Schedule    @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  
  userId          String      // Chi ha fatto la modifica
  action          String      // "CREATED", "UPDATED", "PUBLISHED", "SHIFT_ADDED"
  
  changesBefore   Json?       // Snapshot before
  changesAfter    Json?       // Snapshot after
  
  ipAddress       String?
  userAgent       String?     @db.Text
  
  createdAt       DateTime    @default(now())
  
  @@index([scheduleId])
  @@index([userId])
  @@index([createdAt])
}

model SystemAuditLog {
  id              String      @id @default(uuid())
  
  userId          String?
  entityType      String      // "User", "Company", "Schedule"
  entityId        String
  action          String
  
  changes         Json?
  
  createdAt       DateTime    @default(now())
  
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 🚀 Roadmap Implementazione Step-by-Step

### FASE 0: Setup Fondamenta (Settimana 1)

#### Step 0.1: MCP Vercel Integration in Claude Code

**Obiettivo:** Configurare MCP per gestire deployment Vercel direttamente da Claude Code.

**Azioni:**
1. Installa MCP Vercel in Claude Desktop:
```json
// Claude Desktop config.json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-vercel"]
    }
  }
}
```

2. ⚠️ **CHIEDI:** "Per favore fornisci il tuo Vercel Access Token (puoi ottenerlo da https://vercel.com/account/tokens)"

3. Configura token:
```bash
export VERCEL_ACCESS_TOKEN="your_token_here"
```

4. Test MCP commands disponibili:
- `list_projects` - Lista progetti
- `get_project` - Info progetto
- `list_deployments` - Lista deploy
- `get_deployment` - Info deploy
- `create_deployment` - Trigger deploy

**Output:** MCP Vercel funzionante in Claude Code.

#### Step 0.2: Playwright Setup per Testing

**Obiettivo:** Configurare Playwright per E2E tests mobile + desktop.

**Azioni:**
1. Installa Playwright:
```bash
npm init playwright@latest
```

2. Configura playwright.config.ts:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    // Mobile viewports (PRIORITARI)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

3. Crea test structure:
```
/tests
  /e2e
    onboarding.spec.ts
    auth.spec.ts
    schedule.spec.ts
  /mobile
    mobile-navigation.spec.ts
    touch-interactions.spec.ts
```

4. Esempio test mobile-first:
```typescript
// tests/mobile/mobile-navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE
  
  test('should show hamburger menu on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Desktop menu nascosto
    const desktopMenu = page.locator('[data-testid="desktop-nav"]');
    await expect(desktopMenu).toBeHidden();
    
    // Hamburger visibile
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeVisible();
    
    // Click hamburger apre menu
    await hamburger.click();
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();
  });
  
  test('touch targets are at least 44px', async ({ page }) => {
    await page.goto('/dashboard');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
```

**Output:** Playwright configurato con tests mobile-first.

#### Step 0.3: i18n Setup Completo

**Obiettivo:** Sistema multilingua funzionante (IT + EN).

**Azioni:**
1. Installa next-intl:
```bash
npm install next-intl
```

2. Crea struttura file:
```
/messages
  /it.json
  /en.json
i18n.ts
middleware.ts
```

3. Implementa i18n.ts (vedi sezione i18n sopra)

4. Crea file traduzioni iniziali:
```json
// messages/it.json
{
  "common": {
    "appName": "Turnjob",
    "welcome": "Benvenuto",
    "save": "Salva",
    "cancel": "Annulla",
    "loading": "Caricamento...",
    "error": "Errore",
    "success": "Successo"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "calendar": "Calendario",
    "requests": "Richieste",
    "team": "Team",
    "schedule": "Turni",
    "settings": "Impostazioni"
  }
}

// messages/en.json
{
  "common": {
    "appName": "Turnjob",
    "welcome": "Welcome",
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "calendar": "Calendar",
    "requests": "Requests",
    "team": "Team",
    "schedule": "Schedule",
    "settings": "Settings"
  }
}
```

5. Aggiorna layout root:
```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Output:** Sistema i18n funzionante con IT/EN.

**✅ CHECKPOINT FASE 0:**
- [ ] MCP Vercel integrato e funzionante
- [ ] Playwright configurato con test mobile
- [ ] Sistema i18n IT/EN attivo
- [ ] Tutti i test passano

---

### FASE 1: Database Schema & Auth (Settimana 1-2)

#### Step 1.1: Migration Schema Prisma Completo

**Obiettivo:** Implementare schema database completo.

**Azioni:**
1. Backup database esistente:
```bash
npx prisma db pull # Salva schema attuale
```

2. Aggiungi nuovo schema (vedi sezione Database Schema sopra)

3. Genera migration:
```bash
npx prisma migrate dev --name add_complete_schema
```

4. Verifica in Supabase Studio che tutte le tabelle siano create

5. Seed iniziale:
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Default Skills
  const skills = await Promise.all([
    prisma.skill.create({ data: { name: 'Barista', category: 'technical' } }),
    prisma.skill.create({ data: { name: 'Cameriere', category: 'technical' } }),
    prisma.skill.create({ data: { name: 'Cuoco', category: 'technical' } }),
    prisma.skill.create({ data: { name: 'Primo Soccorso', category: 'certification' } }),
  ]);

  // Default LLM Provider (xAI)
  const xaiProvider = await prisma.llmProvider.create({
    data: {
      name: 'xai',
      displayName: 'xAI (Grok)',
      isActive: true,
      models: {
        create: [
          {
            modelId: 'grok-beta',
            displayName: 'Grok Beta',
            inputCostPer1M: 5.0,
            outputCostPer1M: 15.0,
            supportsStreaming: true,
            supportsStructured: true,
            maxTokens: 8192,
            isActive: true,
            priority: 1
          }
        ]
      }
    }
  });

  // Global LLM Configuration
  await prisma.llmConfiguration.create({
    data: {
      companyId: null, // Global default
      onboardingModelId: xaiProvider.models[0].id,
      constraintModelId: xaiProvider.models[0].id,
      explanationModelId: xaiProvider.models[0].id,
      validationModelId: xaiProvider.models[0].id,
      enableFallback: false,
      fallbackModelIds: [],
      dailyBudgetLimit: 50.0,
      monthlyBudgetLimit: 500.0
    }
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

6. Esegui seed:
```bash
npx prisma db seed
```

**Output:** Database schema completo e popolato con dati iniziali.

#### Step 1.2: Auth con Supabase (già configurato, verifica)

**Obiettivo:** Verificare setup auth esistente.

**Azioni:**
1. Verifica .env:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
```

2. Crea lib/supabase/client.ts:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createClient() {
  return createClientComponentClient();
}
```

3. Middleware auth (integrato con i18n):
```typescript
// middleware.ts (già esiste, aggiungi auth check)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

export async function middleware(req: NextRequest) {
  // i18n handling
  const intlMiddleware = createIntlMiddleware({
    locales: ['it', 'en'],
    defaultLocale: 'it'
  });
  
  const res = intlMiddleware(req);
  
  // Auth handling
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  // Protected routes
  const protectedPaths = ['/dashboard', '/schedule', '/admin'];
  const isProtected = protectedPaths.some(path => 
    req.nextUrl.pathname.includes(path)
  );
  
  if (isProtected && !session) {
    const loginUrl = new URL(`/${req.nextUrl.pathname.split('/')[1]}/login`, req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
```

**Output:** Auth middleware funzionante con protezione routes.

**✅ CHECKPOINT FASE 1:**
- [ ] Schema database completo migrato
- [ ] Seed database eseguito con successo
- [ ] Auth Supabase funzionante
- [ ] Protected routes verificate

---

### FASE 2: LLM Router & AI Foundation (Settimana 2-3)

#### Step 2.1: Setup OpenRouter Integration

**Obiettivo:** Integrare OpenRouter come gateway unificato per accesso a tutti i modelli LLM.

**⚠️ CHIEDI CREDENZIALI:**
"Per procedere con l'integrazione AI, ho bisogno della tua OpenRouter API Key. Puoi ottenerla da https://openrouter.ai/keys. OpenRouter ci darà accesso a xAI Grok, OpenAI, Anthropic, Google Gemini e molti altri modelli con un'unica API."

**Vantaggi OpenRouter:**
- ✅ Accesso unificato a 150+ modelli (xAI Grok, GPT-4, Claude, Gemini, Llama, etc.)
- ✅ Un solo API key invece di multipli
- ✅ Fallback automatico integrato
- ✅ Rate limiting intelligente
- ✅ Prezzi competitivi (spesso più bassi dei provider diretti)
- ✅ Dashboard analytics unificata
- ✅ Credits system per semplificare billing

**Azioni:**
1. Installa dipendenze:
```bash
npm install ai @ai-sdk/openai zod
```

2. Crea OpenRouter client wrapper:
```typescript
// lib/ai/openrouter.ts
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
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://turnjob.com',
      'X-Title': 'Turnjob'
    }
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

  // Anthropic Claude (fallback premium)
  claude35Sonnet: 'anthropic/claude-3.5-sonnet',
  claude3Haiku: 'anthropic/claude-3-haiku',

  // Google Gemini (fallback economico)
  gemini2Flash: 'google/gemini-2.0-flash-exp:free',
  gemini15Pro: 'google/gemini-pro-1.5',

  // Open Source (fallback gratuito)
  llama32_90b: 'meta-llama/llama-3.2-90b-vision-instruct:free',
  qwen32b: 'qwen/qwen-2.5-72b-instruct'
} as const;
```

3. Crea LLM Router centrale con OpenRouter:
```typescript
// lib/ai/router.ts
import { generateObject, generateText, streamText } from 'ai';
import { createOpenRouter, OPENROUTER_MODELS } from './openrouter';
import { db } from '@/lib/db';

type UseCase = 'onboarding' | 'constraint' | 'explanation' | 'validation';

export class LlmRouter {
  private static instance: LlmRouter;
  private openRouter: ReturnType<typeof createOpenRouter>;

  static getInstance() {
    if (!this.instance) {
      this.instance = new LlmRouter();
    }
    return this.instance;
  }

  constructor() {
    this.openRouter = createOpenRouter();
  }

  async getModel(useCase: UseCase, companyId?: string) {
    const config = await this.getConfiguration(companyId);

    const modelIdMap = {
      onboarding: config.onboardingModelId,
      constraint: config.constraintModelId,
      explanation: config.explanationModelId,
      validation: config.validationModelId,
    };

    const modelId = modelIdMap[useCase];
    const modelConfig = await db.llmModel.findUnique({
      where: { id: modelId },
      include: { provider: true }
    });

    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Tutti i modelli passano attraverso OpenRouter
    // modelConfig.modelId contiene il nome OpenRouter (es: "x-ai/grok-beta")
    return this.openRouter(modelConfig.modelId);
  }
  
  async executeWithFallback<T>(
    useCase: UseCase,
    operation: (model: any) => Promise<T>,
    companyId?: string
  ): Promise<T> {
    const model = await this.getModel(useCase, companyId);
    const startTime = Date.now();
    
    try {
      const result = await operation(model);
      
      // Log success
      await this.logUsage({
        companyId: companyId || 'system',
        modelId: model.id,
        useCase,
        latencyMs: Date.now() - startTime,
        wasSuccessful: true
      });
      
      return result;
    } catch (error) {
      await this.logUsage({
        companyId: companyId || 'system',
        modelId: model.id,
        useCase,
        latencyMs: Date.now() - startTime,
        wasSuccessful: false,
        errorMessage: (error as Error).message
      });
      
      throw error;
    }
  }
  
  private async getConfiguration(companyId?: string) {
    return await db.llmConfiguration.findFirst({
      where: { companyId: companyId || null }
    });
  }
  
  private async logUsage(log: any) {
    await db.aiGenerationLog.create({ data: log });
  }
}

// Helper functions
export async function generateWithRouter<T>(
  useCase: UseCase,
  prompt: string,
  schema: any,
  companyId?: string
): Promise<T> {
  const router = LlmRouter.getInstance();
  
  return router.executeWithFallback(
    useCase,
    async (model) => {
      const result = await generateObject({
        model,
        schema,
        prompt
      });
      return result.object;
    },
    companyId
  );
}

export async function streamWithRouter(
  useCase: UseCase,
  messages: any[],
  companyId?: string
) {
  const router = LlmRouter.getInstance();
  const model = await router.getModel(useCase, companyId);
  
  return streamText({
    model,
    messages
  });
}
```

4. API Route test:
```typescript
// app/api/ai/test/route.ts
import { generateWithRouter } from '@/lib/ai/router';
import { z } from 'zod';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  const result = await generateWithRouter(
    'onboarding',
    prompt,
    z.object({
      businessType: z.string(),
      employeeCount: z.number()
    })
  );
  
  return Response.json(result);
}
```

**Output:** LLM Router funzionante con OpenRouter che fornisce accesso a xAI Grok, OpenAI, Anthropic, Google Gemini e 150+ altri modelli.

**Vantaggi implementazione:**
- ✅ Cambio modello senza modificare codice (solo config DB)
- ✅ Fallback automatico tra modelli in caso di errori
- ✅ Cost tracking unificato
- ✅ Un solo API key da gestire
- ✅ Prezzi trasparenti e competitivi

#### Step 2.2: Admin UI Configurazione LLM

**Obiettivo:** Interface admin per gestire modelli LLM.

**Azioni:**
1. Crea pagina admin:
```typescript
// app/[locale]/(admin)/admin/llm-config/page.tsx
import { db } from '@/lib/db';
import { LlmConfigForm } from '@/components/admin/llm-config-form';

export default async function LlmConfigPage() {
  const providers = await db.llmProvider.findMany({
    include: { models: true }
  });
  
  const config = await db.llmConfiguration.findFirst({
    where: { companyId: null } // Global config
  });
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Configurazione LLM
      </h1>
      
      <LlmConfigForm 
        providers={providers} 
        initialConfig={config} 
      />
    </div>
  );
}
```

2. Form component:
```typescript
// components/admin/llm-config-form.tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LlmConfigForm({ providers, initialConfig }: any) {
  const t = useTranslations('admin.llm');
  const [config, setConfig] = useState(initialConfig);
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t('modelSelection')}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('onboardingModel')}
            </label>
            <Select
              value={config?.onboardingModelId}
              onChange={(e) => setConfig({
                ...config,
                onboardingModelId: e.target.value
              })}
            >
              {providers.flatMap(p => p.models.map(m => (
                <option key={m.id} value={m.id}>
                  {p.displayName} - {m.displayName} 
                  (${m.inputCostPer1M}/${m.outputCostPer1M} per 1M)
                </option>
              )))}
            </Select>
          </div>
          
          {/* Ripeti per altri use cases */}
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t('budgetControl')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">
              {t('dailyLimit')} (€)
            </label>
            <Input
              type="number"
              value={config?.dailyBudgetLimit || ''}
              onChange={(e) => setConfig({
                ...config,
                dailyBudgetLimit: parseFloat(e.target.value)
              })}
            />
          </div>
          
          <div>
            <label className="block text-sm mb-2">
              {t('monthlyLimit')} (€)
            </label>
            <Input
              type="number"
              value={config?.monthlyBudgetLimit || ''}
              onChange={(e) => setConfig({
                ...config,
                monthlyBudgetLimit: parseFloat(e.target.value)
              })}
            />
          </div>
        </div>
      </Card>
      
      <Button 
        onClick={async () => {
          await fetch('/api/admin/llm-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
        }}
      >
        {t('save')}
      </Button>
    </div>
  );
}
```

3. API Route salvataggio:
```typescript
// app/api/admin/llm-config/route.ts
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const config = await req.json();
  
  const updated = await db.llmConfiguration.upsert({
    where: { companyId: null },
    create: config,
    update: config
  });
  
  return Response.json(updated);
}
```

**Output:** Admin UI per gestire LLM configuration.

**✅ CHECKPOINT FASE 2:**
- [ ] xAI Grok integrato e funzionante
- [ ] LLM Router implementato
- [ ] Admin UI configurazione LLM funzionante
- [ ] Test API /ai/test passa

---

### FASE 3: Onboarding Dual-Mode (Settimana 3-4)

#### Step 3.1: Onboarding Welcome & Mode Selection

**Obiettivo:** Schermata scelta modalità onboarding.

**Azioni:**
1. Crea pagina welcome:
```typescript
// app/[locale]/(onboarding)/onboarding/welcome/page.tsx
import { WelcomeModeSelector } from '@/components/onboarding/mode-selector';
import { useTranslations } from 'next-intl';

export default function OnboardingWelcome() {
  const t = useTranslations('onboarding');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {t('welcome.title')}
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            {t('welcome.subtitle')}
          </p>
        </div>
        
        <WelcomeModeSelector />
      </div>
    </div>
  );
}
```

2. Component mode selector (mobile-first):
```typescript
// components/onboarding/mode-selector.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Zap } from 'lucide-react';

export function WelcomeModeSelector() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [mode, setMode] = useState<'manual' | 'ai' | null>(null);
  
  return (
    <div className="space-y-6">
      {/* Grid: mobile 1 col, desktop 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* AI Mode Card */}
        <Card 
          className={`
            p-4 md:p-6 cursor-pointer transition-all
            hover:shadow-lg border-2
            ${mode === 'ai' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          `}
          onClick={() => setMode('ai')}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 md:p-3 bg-blue-100 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg">
                {t('mode.ai.title')}
              </h3>
              <span className="text-xs md:text-sm text-blue-600 font-medium">
                {t('mode.ai.badge')}
              </span>
            </div>
          </div>
          
          <p className="text-sm md:text-base text-gray-600 mb-4">
            {t('mode.ai.description')}
          </p>
          
          <div className="space-y-2 text-xs md:text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <Zap className="w-4 h-4 shrink-0" />
              <span>{t('mode.ai.benefit1')}</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Zap className="w-4 h-4 shrink-0" />
              <span>{t('mode.ai.benefit2')}</span>
            </div>
          </div>
        </Card>
        
        {/* Manual Mode Card */}
        <Card 
          className={`
            p-4 md:p-6 cursor-pointer transition-all
            hover:shadow-lg border-2
            ${mode === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          `}
          onClick={() => setMode('manual')}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 md:p-3 bg-gray-100 rounded-lg shrink-0">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg">
                {t('mode.manual.title')}
              </h3>
              <span className="text-xs md:text-sm text-gray-600 font-medium">
                {t('mode.manual.badge')}
              </span>
            </div>
          </div>
          
          <p className="text-sm md:text-base text-gray-600 mb-4">
            {t('mode.manual.description')}
          </p>
          
          <div className="space-y-2 text-xs md:text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4 shrink-0" />
              <span>{t('mode.manual.benefit1')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4 shrink-0" />
              <span>{t('mode.manual.benefit2')}</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* CTA Button - full width mobile, centered desktop */}
      <div className="text-center">
        <Button 
          size="lg" 
          disabled={!mode}
          className="w-full md:w-auto min-w-[200px]"
          onClick={() => {
            router.push(mode === 'ai' ? '/onboarding/ai' : '/onboarding/manual');
          }}
        >
          {mode === 'ai' ? t('mode.ai.cta') : t('mode.manual.cta')}
        </Button>
        
        <p className="text-xs md:text-sm text-gray-500 mt-3">
          {t('mode.switchNote')}
        </p>
      </div>
    </div>
  );
}
```

3. Traduzioni:
```json
// messages/it.json
{
  "onboarding": {
    "welcome": {
      "title": "Benvenuto in Turnjob 👋",
      "subtitle": "Come preferisci configurare la tua azienda?"
    },
    "mode": {
      "ai": {
        "title": "Setup Guidato AI",
        "badge": "Consigliato • Veloce",
        "description": "L'AI ti guida con una conversazione naturale.",
        "benefit1": "Setup in 15-20 minuti",
        "benefit2": "Nessuna esperienza tecnica richiesta",
        "cta": "Inizia con AI 🚀"
      },
      "manual": {
        "title": "Setup Manuale",
        "badge": "Controllo Completo",
        "description": "Compila form tradizionali passo dopo passo.",
        "benefit1": "Setup in 30-40 minuti",
        "benefit2": "Massimo controllo e precisione",
        "cta": "Inizia Setup Manuale"
      },
      "switchNote": "Puoi sempre cambiare modalità durante il processo"
    }
  }
}

// messages/en.json
{
  "onboarding": {
    "welcome": {
      "title": "Welcome to Turnjob 👋",
      "subtitle": "How would you like to set up your company?"
    },
    "mode": {
      "ai": {
        "title": "AI-Guided Setup",
        "badge": "Recommended • Fast",
        "description": "AI guides you through a natural conversation.",
        "benefit1": "Setup in 15-20 minutes",
        "benefit2": "No technical experience required",
        "cta": "Start with AI 🚀"
      },
      "manual": {
        "title": "Manual Setup",
        "badge": "Full Control",
        "description": "Fill traditional forms step by step.",
        "benefit1": "Setup in 30-40 minutes",
        "benefit2": "Maximum control and precision",
        "cta": "Start Manual Setup"
      },
      "switchNote": "You can always switch modes during the process"
    }
  }
}
```

**Output:** Onboarding welcome page mobile-first con i18n.

#### Step 3.2: AI Conversational Onboarding

**Obiettivo:** Chat interface con AI per onboarding.

**Azioni:**
1. Pagina AI onboarding:
```typescript
// app/[locale]/(onboarding)/onboarding/ai/page.tsx
import { AiOnboardingChat } from '@/components/onboarding/ai-chat';

export default function AiOnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AiOnboardingChat />
    </div>
  );
}
```

2. Chat component (mobile-optimized):
```typescript
// components/onboarding/ai-chat.tsx
'use client';
import { useChat } from 'ai/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function AiOnboardingChat() {
  const t = useTranslations('onboarding.ai');
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/onboarding/ai/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: t('initialMessage')
      }
    ]
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header - fixed */}
      <div className="bg-white border-b px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="font-semibold text-base md:text-lg">
              {t('title')}
            </h2>
            <p className="text-xs md:text-sm text-gray-600">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`
              flex gap-3
              ${message.role === 'user' ? 'justify-end' : 'justify-start'}
            `}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            )}
            
            <div
              className={`
                rounded-2xl px-4 py-2 max-w-[85%] md:max-w-[70%]
                ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
                }
              `}
            >
              <p className="text-sm md:text-base whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input - fixed bottom */}
      <div className="bg-white border-t p-4 md:p-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={t('inputPlaceholder')}
            disabled={isLoading}
            className="flex-1 text-sm md:text-base"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="shrink-0 w-10 h-10 md:w-12 md:h-12"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

3. API Route chat:
```typescript
// app/api/onboarding/ai/chat/route.ts
import { streamWithRouter } from '@/lib/ai/router';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth'; // Implementa auth helper

export async function POST(req: Request) {
  const { messages } = await req.json();
  const session = await auth();
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Get or create onboarding session
  let onboardingSession = await db.onboardingSession.findFirst({
    where: {
      companyId: session.user.companyId,
      isCompleted: false
    }
  });
  
  if (!onboardingSession) {
    onboardingSession = await db.onboardingSession.create({
      data: {
        companyId: session.user.companyId,
        mode: 'AI_ASSISTED',
        conversationLog: []
      }
    });
  }
  
  // System prompt
  const systemPrompt = `Sei un assistente AI che aiuta proprietari di piccole imprese italiane a configurare il loro sistema di gestione turni.

Il tuo obiettivo è raccogliere informazioni su:
1. Tipo di attività (ristorante, bar, retail, altro)
2. Numero di dipendenti e loro ruoli
3. Orari di apertura e giorni lavorativi
4. Picchi di lavoro (giorni/orari con più clienti)
5. Vincoli specifici (pause, straordinari, preferenze)

REGOLE:
- Fai MAX 1-2 domande alla volta
- Usa linguaggio semplice e amichevole
- Se l'utente dà informazioni vaghe, chiedi chiarimenti
- Quando hai abbastanza info, riassumi e chiedi conferma
- Parla sempre in italiano

Informazioni raccolte finora: ${JSON.stringify(onboardingSession.extractedData || {})}`;
  
  const result = await streamWithRouter(
    'onboarding',
    [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    session.user.companyId
  );
  
  // Update conversation log
  await db.onboardingSession.update({
    where: { id: onboardingSession.id },
    data: {
      conversationLog: messages
    }
  });
  
  return result.toTextStreamResponse();
}
```

**Output:** AI chat onboarding funzionante e responsive.

#### Step 3.3: Manual Onboarding Flow

**Obiettivo:** Form tradizionali multi-step per onboarding manuale.

**Azioni:**
1. Wizard component con stepper:
```typescript
// components/onboarding/manual-wizard.tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const STEPS = [
  'company',
  'hours',
  'positions',
  'employees',
  'constraints'
];

export function ManualOnboardingWizard() {
  const t = useTranslations('onboarding.manual');
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Stepper - horizontal scroll mobile */}
        <div className="bg-white rounded-lg p-4 mb-6 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[500px] md:min-w-0">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                
                {index < STEPS.length - 1 && (
                  <div className={`
                    h-1 w-12 md:w-20 mx-2
                    ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <div className="bg-white rounded-lg p-4 md:p-6">
          {currentStep === 0 && <CompanyInfoStep data={data} setData={setData} />}
          {currentStep === 1 && <WorkingHoursStep data={data} setData={setData} />}
          {currentStep === 2 && <PositionsStep data={data} setData={setData} />}
          {currentStep === 3 && <EmployeesStep data={data} setData={setData} />}
          {currentStep === 4 && <ConstraintsStep data={data} setData={setData} />}
          
          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 md:flex-none"
              >
                {t('back')}
              </Button>
            )}
            
            <Button
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep(currentStep + 1);
                } else {
                  // Submit
                  handleSubmit(data);
                }
              }}
              className="flex-1"
            >
              {currentStep === STEPS.length - 1 
                ? t('complete') 
                : t('next')
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step components (mobile-optimized forms)
function CompanyInfoStep({ data, setData }: any) {
  const t = useTranslations('onboarding.manual.company');
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-semibold mb-4">
        {t('title')}
      </h2>
      
      {/* Form fields con label sempre visibili, input full-width mobile */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('businessName')}
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 border rounded-lg"
          value={data.name || ''}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </div>
      
      {/* Altri campi... */}
    </div>
  );
}

// Implementa altri step components...
```

**Output:** Manual onboarding wizard completo e mobile-friendly.

**✅ CHECKPOINT FASE 3:**
- [ ] Welcome page con mode selection funzionante
- [ ] AI chat onboarding responsive
- [ ] Manual wizard funzionante
- [ ] Entrambi i flow salvano dati correttamente
- [ ] Traduzioni IT/EN complete
- [ ] Test Playwright mobile passano

---

### FASE 4: Schedule Optimization Engine (Settimana 5-6)

#### Step 4.1: highs-js Solver Integration

**Obiettivo:** Integrare solver MILP per ottimizzazione turni.

**Azioni:**
1. Installa highs-js:
```bash
npm install highs
```

2. Crea solver wrapper:
```typescript
// lib/optimization/solver.ts
import Highs from 'highs';
import { db } from '@/lib/db';

export interface Employee {
  id: string;
  name: string;
  positionId: string;
  availability: any;
  preferences: any;
}

export interface Shift {
  date: string;
  startTime: string;
  endTime: string;
  positionId: string;
  minStaff: number;
}

export interface Constraint {
  type: 'hard' | 'soft';
  rules: any;
}

export class ScheduleSolver {
  private highs: any;
  
  async initialize() {
    this.highs = await Highs();
  }
  
  async solve(
    employees: Employee[],
    shifts: Shift[],
    constraints: Constraint[]
  ) {
    if (!this.highs) {
      await this.initialize();
    }
    
    // Build MILP model
    const model = this.buildModel(employees, shifts, constraints);
    
    // Set time limit (25s per sub-30s requirement)
    this.highs.setTimeLimit(25);
    
    // Solve
    const solution = this.highs.solve(model);
    
    if (solution.status === 'optimal' || solution.status === 'feasible') {
      return this.parseSolution(solution, employees, shifts);
    }
    
    throw new Error('No feasible schedule found');
  }
  
  private buildModel(employees: Employee[], shifts: Shift[], constraints: Constraint[]) {
    // Variables: x[employee][shift] = 1 if assigned, 0 otherwise
    const variables: any[] = [];
    
    employees.forEach((emp, i) => {
      shifts.forEach((shift, j) => {
        variables.push({
          name: `x_${emp.id}_${shift.date}_${shift.startTime}`,
          type: 'binary',
          obj: this.calculateCost(emp, shift) // Objective: minimize cost
        });
      });
    });
    
    // Constraints
    const constraints_arr = [
      ...this.buildCoverageConstraints(employees, shifts),
      ...this.buildAvailabilityConstraints(employees, shifts),
      ...this.buildMaxHoursConstraints(employees, shifts),
      ...this.buildLegalConstraints(employees, shifts),
    ];
    
    return {
      sense: 'minimize',
      objective: { vars: variables.map(v => v.name), coeffs: variables.map(v => v.obj) },
      constraints: constraints_arr,
      variables
    };
  }
  
  private buildCoverageConstraints(employees: Employee[], shifts: Shift[]) {
    const constraints: any[] = [];
    
    shifts.forEach(shift => {
      // Per ogni turno: somma(x[e][s]) >= minStaff
      const vars = employees
        .filter(e => e.positionId === shift.positionId)
        .map(e => `x_${e.id}_${shift.date}_${shift.startTime}`);
      
      if (vars.length > 0) {
        constraints.push({
          type: 'gte',
          vars,
          coeffs: Array(vars.length).fill(1),
          rhs: shift.minStaff,
          name: `coverage_${shift.date}_${shift.startTime}`
        });
      }
    });
    
    return constraints;
  }
  
  private buildAvailabilityConstraints(employees: Employee[], shifts: Shift[]) {
    const constraints: any[] = [];
    
    employees.forEach(emp => {
      shifts.forEach(shift => {
        // Se dipendente non disponibile: x[e][s] = 0
        if (!this.isAvailable(emp, shift)) {
          constraints.push({
            type: 'eq',
            vars: [`x_${emp.id}_${shift.date}_${shift.startTime}`],
            coeffs: [1],
            rhs: 0,
            name: `avail_${emp.id}_${shift.date}`
          });
        }
      });
    });
    
    return constraints;
  }
  
  private buildMaxHoursConstraints(employees: Employee[], shifts: Shift[]) {
    const constraints: any[] = [];
    
    employees.forEach(emp => {
      // Somma ore settimanali <= 40
      const weeklyShifts = shifts.filter(s => 
        this.isSameWeek(s.date, new Date())
      );
      
      const vars = weeklyShifts.map(s => 
        `x_${emp.id}_${s.date}_${s.startTime}`
      );
      
      const hours = weeklyShifts.map(s => 
        this.calculateShiftHours(s)
      );
      
      if (vars.length > 0) {
        constraints.push({
          type: 'lte',
          vars,
          coeffs: hours,
          rhs: 40,
          name: `maxhours_${emp.id}`
        });
      }
    });
    
    return constraints;
  }
  
  private buildLegalConstraints(employees: Employee[], shifts: Shift[]) {
    // CCNL compliance: pause obbligatorie, riposo minimo tra turni, etc
    const constraints: any[] = [];
    
    // Esempio: min 11 ore di riposo tra turni consecutivi
    employees.forEach(emp => {
      for (let i = 0; i < shifts.length - 1; i++) {
        const shift1 = shifts[i];
        const shift2 = shifts[i + 1];
        
        if (this.hoursGap(shift1, shift2) < 11) {
          // Se assegnato a shift1, NON può essere assegnato a shift2
          constraints.push({
            type: 'lte',
            vars: [
              `x_${emp.id}_${shift1.date}_${shift1.startTime}`,
              `x_${emp.id}_${shift2.date}_${shift2.startTime}`
            ],
            coeffs: [1, 1],
            rhs: 1,
            name: `rest_${emp.id}_${i}`
          });
        }
      }
    });
    
    return constraints;
  }
  
  private parseSolution(solution: any, employees: Employee[], shifts: Shift[]) {
    const assignments: any[] = [];
    
    employees.forEach(emp => {
      shifts.forEach(shift => {
        const varName = `x_${emp.id}_${shift.date}_${shift.startTime}`;
        const value = solution.values[varName];
        
        if (value === 1) {
          assignments.push({
            employeeId: emp.id,
            shiftId: shift.id,
            confidence: 0.9, // ILP = alta confidenza
            reasoning: this.generateReasoning(emp, shift)
          });
        }
      });
    });
    
    return {
      assignments,
      metadata: {
        objective: solution.objective,
        status: solution.status,
        solveTime: solution.solveTime
      }
    };
  }
  
  // Helper methods
  private calculateCost(emp: Employee, shift: Shift): number {
    let cost = 1.0; // Base cost
    
    // Penalties per soft constraints
    if (!emp.preferences?.preferredDays?.includes(shift.date)) {
      cost += 0.5;
    }
    
    if (!emp.preferences?.preferredShifts?.includes(shift.startTime)) {
      cost += 0.3;
    }
    
    return cost;
  }
  
  private isAvailable(emp: Employee, shift: Shift): boolean {
    // Check availability from employee.availability JSON
    const dayOfWeek = new Date(shift.date).getDay();
    return emp.availability?.weeklyPattern?.[dayOfWeek] !== false;
  }
  
  private isSameWeek(date1: string, date2: Date): boolean {
    // Implementation...
    return true;
  }
  
  private calculateShiftHours(shift: Shift): number {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    return (endH * 60 + endM - startH * 60 - startM) / 60;
  }
  
  private hoursGap(shift1: Shift, shift2: Shift): number {
    // Calculate hours between end of shift1 and start of shift2
    return 12; // Placeholder
  }
  
  private generateReasoning(emp: Employee, shift: Shift): string {
    return `Assegnato ${emp.name} al turno ${shift.date} ${shift.startTime}-${shift.endTime} perché: disponibile, competenze match, rispetta vincoli settimanali.`;
  }
}
```

**Output:** Solver ottimizzazione funzionante.

#### Step 4.2: Inngest Background Jobs

**⚠️ CHIEDI CREDENZIALI:**
"Per configurare i background jobs, ho bisogno delle credenziali Inngest:
1. Crea account su https://inngest.com
2. Copia Event Key da dashboard
3. Forniscilo qui"

**Azioni:**
1. Installa Inngest:
```bash
npm install inngest
```

2. Configura Inngest client:
```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'turnjob',
  eventKey: process.env.INNGEST_EVENT_KEY
});
```

3. Crea function generazione schedule:
```typescript
// lib/inngest/functions/generate-schedule.ts
import { inngest } from '../client';
import { ScheduleSolver } from '@/lib/optimization/solver';
import { db } from '@/lib/db';

export const generateSchedule = inngest.createFunction(
  { 
    id: 'generate-schedule',
    retries: 3,
    concurrency: 5
  },
  { event: 'schedule/generate.requested' },
  async ({ event, step }) => {
    const { companyId, startDate, endDate } = event.data;
    
    // Step 1: Fetch data
    const data = await step.run('fetch-data', async () => {
      const [company, employees, positions, constraints] = await Promise.all([
        db.company.findUnique({ where: { id: companyId } }),
        db.user.findMany({ 
          where: { companyId, isActive: true },
          include: { skills: true }
        }),
        db.position.findMany({ where: { companyId } }),
        db.constraint.findMany({ 
          where: { companyId, isActive: true }
        })
      ]);
      
      return { company, employees, positions, constraints };
    });
    
    // Step 2: Generate shifts template
    const shifts = await step.run('generate-shifts', async () => {
      const shiftTemplate = [];
      const currentDate = new Date(startDate);
      const endDateTime = new Date(endDate);
      
      while (currentDate <= endDateTime) {
        // Generate shifts per position per day
        data.positions.forEach(position => {
          shiftTemplate.push({
            date: currentDate.toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00',
            positionId: position.id,
            minStaff: position.minStaffPerShift
          });
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return shiftTemplate;
    });
    
    // Step 3: Optimize with solver
    const solution = await step.run('optimize', async () => {
      const solver = new ScheduleSolver();
      return await solver.solve(
        data.employees,
        shifts,
        data.constraints
      );
    });
    
    // Step 4: Save to database
    const schedule = await step.run('save-schedule', async () => {
      const schedule = await db.schedule.create({
        data: {
          name: `Schedule ${startDate} - ${endDate}`,
          companyId,
          startDate,
          endDate,
          generationType: 'AI_GENERATED',
          status: 'DRAFT',
          aiMetadata: solution.metadata,
          shifts: {
            create: shifts.map((shift, idx) => ({
              date: new Date(shift.date),
              startTime: shift.startTime,
              endTime: shift.endTime,
              positionId: shift.positionId,
              minStaff: shift.minStaff,
              isAiGenerated: true,
              aiConfidence: solution.assignments[idx]?.confidence,
              aiReasoning: solution.assignments[idx]?.reasoning,
              assignments: {
                create: solution.assignments
                  .filter(a => a.shiftId === shift.id)
                  .map(a => ({
                    userId: a.employeeId,
                    assignmentType: 'AI_SUGGESTED',
                    confidenceScore: a.confidence
                  }))
              }
            }))
          }
        },
        include: {
          shifts: {
            include: {
              assignments: true
            }
          }
        }
      });
      
      return schedule;
    });
    
    return { scheduleId: schedule.id };
  }
);
```

4. Inngest serve endpoint:
```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { generateSchedule } from '@/lib/inngest/functions/generate-schedule';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateSchedule]
});
```

5. Trigger generation da UI:
```typescript
// app/api/schedule/generate/route.ts
import { inngest } from '@/lib/inngest/client';

export async function POST(req: Request) {
  const { companyId, startDate, endDate } = await req.json();
  
  const { ids } = await inngest.send({
    name: 'schedule/generate.requested',
    data: { companyId, startDate, endDate }
  });
  
  return Response.json({ jobId: ids[0] });
}
```

**Output:** Background job generazione schedule funzionante.

**✅ CHECKPOINT FASE 4:**
- [ ] highs-js solver integrato e testato
- [ ] Inngest configurato e funzionante
- [ ] Job generazione schedule completo
- [ ] Genera schedule test <30 secondi
- [ ] Assignments salvati correttamente

---

---

## 🎨 FASE 5: Dashboard & Calendar UI

### Step 5.1: Calendario Interattivo

**Componente calendario principale con disponibilità real-time:**

```typescript
// components/calendar/schedule-calendar.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

interface ScheduleDay {
  date: Date;
  shifts: {
    id: string;
    startTime: string;
    endTime: string;
    positionName: string;
    slotsTotal: number;
    slotsFilled: number;
    isUserAssigned: boolean;
  }[];
  availability: 'full' | 'limited' | 'none';
}

export function ScheduleCalendar({ 
  scheduleData,
  locale,
  onDateSelect 
}: {
  scheduleData: ScheduleDay[];
  locale: 'it' | 'en';
  onDateSelect: (date: Date) => void;
}) {
  const t = useTranslations('Calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getDayData = (date: Date) => {
    return scheduleData.find(d => isSameDay(d.date, date));
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'full': return 'bg-green-100 border-green-300';
      case 'limited': return 'bg-yellow-100 border-yellow-300';
      case 'none': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Calendario */}
      <div className="flex-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              setSelectedDate(date);
              onDateSelect(date);
            }
          }}
          locale={locale === 'it' ? it : enUS}
          className="rounded-lg border shadow-sm"
          modifiers={{
            available: scheduleData
              .filter(d => d.availability === 'full')
              .map(d => d.date),
            limited: scheduleData
              .filter(d => d.availability === 'limited')
              .map(d => d.date),
            unavailable: scheduleData
              .filter(d => d.availability === 'none')
              .map(d => d.date),
          }}
          modifiersClassNames={{
            available: 'bg-green-50 text-green-900 font-semibold',
            limited: 'bg-yellow-50 text-yellow-900',
            unavailable: 'bg-red-50 text-red-900 line-through',
          }}
        />

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-50 border border-green-200" />
            <span>{t('legend.available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-200" />
            <span>{t('legend.limited')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-50 border border-red-200" />
            <span>{t('legend.full')}</span>
          </div>
        </div>
      </div>

      {/* Dettagli giornata selezionata */}
      <div className="lg:w-96">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">
            {format(selectedDate, 'EEEE d MMMM yyyy', {
              locale: locale === 'it' ? it : enUS
            })}
          </h3>

          {getDayData(selectedDate) ? (
            <div className="space-y-3">
              {getDayData(selectedDate)!.shifts.map(shift => (
                <div
                  key={shift.id}
                  className={`
                    p-3 rounded-lg border-2 
                    ${shift.isUserAssigned ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{shift.positionName}</p>
                      <p className="text-sm text-gray-600">
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                    {shift.isUserAssigned && (
                      <Badge variant="default">{t('status.assigned')}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{t('slots')}:</span>
                    <span className={`
                      font-semibold
                      ${shift.slotsFilled >= shift.slotsTotal ? 'text-red-600' : 'text-green-600'}
                    `}>
                      {shift.slotsFilled} / {shift.slotsTotal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              {t('noShifts')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 5.2: Dashboard Collaboratore

```typescript
// app/[locale]/(dashboard)/dashboard/page.tsx
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default async function DashboardPage({
  params: { locale }
}: {
  params: { locale: string };
}) {
  const t = useTranslations('Dashboard');
  
  // Fetch user data (server component)
  const userData = await getUserDashboardData();

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {t('welcome', { name: userData.firstName })}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Cards riassuntive - Mobile: stack, Desktop: grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quote Ferie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('vacation.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">
                  {userData.quotas.vacation.remaining}
                </span>
                <span className="text-sm text-gray-500">
                  / {userData.quotas.vacation.total} {t('days')}
                </span>
              </div>
              <Progress 
                value={(userData.quotas.vacation.remaining / userData.quotas.vacation.total) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quote Permessi */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('permits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">
                  {userData.quotas.permits.remaining}
                </span>
                <span className="text-sm text-gray-500">
                  / {userData.quotas.permits.total} {t('hours')}
                </span>
              </div>
              <Progress 
                value={(userData.quotas.permits.remaining / userData.quotas.permits.total) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Prossimi Turni */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('upcomingShifts.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {userData.upcomingShifts.count}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {t('upcomingShifts.next')}: {userData.upcomingShifts.nextDate}
            </p>
          </CardContent>
        </Card>

        {/* Richieste Pending */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('pendingRequests.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {userData.pendingRequests}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {t('pendingRequests.waiting')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendario e Richieste Recenti */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario Compatto */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('calendar.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleCalendar 
              scheduleData={userData.scheduleData}
              locale={locale}
              onDateSelect={(date) => {/* Handle */}}
            />
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>{t('activity.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userData.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${activity.type === 'approved' ? 'bg-green-100' : 
                      activity.type === 'rejected' ? 'bg-red-100' : 'bg-blue-100'}
                  `}>
                    {activity.type === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : activity.type === 'rejected' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**✅ CHECKPOINT FASE 5:**
- [ ] Calendario interattivo funzionante
- [ ] Dashboard mobile-first responsive
- [ ] Cards quota con progress bars
- [ ] Activity feed real-time
- [ ] Tutte le traduzioni IT/EN presenti

---

## 📱 FASE 6: Mobile Optimization & PWA

### Step 6.1: PWA Configuration

**1. Setup PWA con next-pwa:**
```bash
npm install next-pwa
```

**2. Configura next.config.js:**
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

module.exports = withPWA({
  // Your existing Next.js config
});
```

**3. Crea manifest.json:**
```json
// public/manifest.json
{
  "name": "Turnjob - Gestione Turni",
  "short_name": "Turnjob",
  "description": "Gestione intelligente turni lavorativi",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Step 6.2: Mobile Bottom Navigation

```typescript
// components/layout/mobile-bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Plus, Bell, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MobileBottomNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations('Navigation');
  
  const navItems = [
    { href: `/${locale}/dashboard`, icon: Home, label: t('home') },
    { href: `/${locale}/calendar`, icon: Calendar, label: t('calendar') },
    { href: `/${locale}/requests/new`, icon: Plus, label: t('newRequest') },
    { href: `/${locale}/notifications`, icon: Bell, label: t('notifications') },
    { href: `/${locale}/profile`, icon: User, label: t('profile') },
  ];
  
  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-50 
      bg-white border-t border-gray-200 
      md:hidden
      pb-safe
    ">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center 
                flex-1 h-full gap-1 
                transition-colors
                ${isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-600 active:text-blue-600'
                }
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**✅ CHECKPOINT FASE 6:**
- [ ] PWA installabile su iOS/Android
- [ ] Bottom navigation mobile
- [ ] Safe area iOS gestito
- [ ] Touch targets >48px
- [ ] Offline support basic
- [ ] Lighthouse PWA score >90

---

## 🧪 FASE 7: Testing & Deployment

### Step 7.1: Playwright E2E Tests

**Setup Playwright:**
```bash
npm install -D @playwright/test
npx playwright install
```

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Critical Test Suite:**
```typescript
// tests/onboarding-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('AI-assisted onboarding completes successfully', async ({ page }) => {
    await page.goto('/it/onboarding/welcome');
    
    // Select AI mode
    await page.click('button:has-text("Usa AI")');
    
    // First question
    await expect(page.locator('text=Come si chiama la tua azienda?')).toBeVisible();
    await page.fill('input[name="message"]', 'Acme Corp');
    await page.click('button[type="submit"]');
    
    // Wait for AI response
    await expect(page.locator('text=Perfetto!')).toBeVisible({ timeout: 10000 });
    
    // Verify configuration saved
    await expect(page.locator('text=Configurazione salvata')).toBeVisible();
  });
});

// tests/request-flow.spec.ts
test.describe('Request Management', () => {
  test('Create vacation request with conflict detection', async ({ page }) => {
    await page.goto('/it/requests/new');
    
    await page.selectOption('select[name="type"]', 'VACATION');
    await page.click('[data-date="2025-12-25"]');
    await page.click('button[type="submit"]');
    
    // Should show conflict if slot full
    await expect(page.locator('text=Slot non disponibile')).toBeVisible();
  });
});
```

**Run tests:**
```bash
npx playwright test
npx playwright test --project="Mobile Chrome"
npx playwright test --ui
```

### Step 7.2: Vercel Deployment

**⚠️ CHIEDI CREDENZIALI:**
"Per il deployment su Vercel, ho bisogno del Vercel Access Token"

```bash
# Install and login
npm i -g vercel
vercel login

# Link project
vercel link

# Configure env vars
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add XAI_API_KEY
vercel env add INNGEST_EVENT_KEY

# Deploy
vercel --prod
```

### Step 7.3: Pre-Launch Checklist

**Security:**
- [ ] RLS policies attive
- [ ] API rate limiting
- [ ] Environment variables sicure
- [ ] CORS configurato
- [ ] XSS protection
- [ ] CSRF tokens

**Performance:**
- [ ] Images ottimizzate (WebP)
- [ ] Code splitting attivo
- [ ] Lazy loading implementato
- [ ] CDN configurato
- [ ] Database indexes
- [ ] API caching

**SEO & Legal:**
- [ ] Meta tags completi
- [ ] Sitemap.xml
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] GDPR compliance

**Monitoring:**
- [ ] Sentry error tracking
- [ ] Analytics (PostHog)
- [ ] Uptime monitoring
- [ ] Performance monitoring

**Testing:**
- [ ] All Playwright tests passing
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Load testing

---

## ✅ FINAL COMPLETION CHECKLIST

**🎯 MVP Ready quando:**
- [ ] Tutti i test Playwright passano
- [ ] i18n IT/EN completo
- [ ] Mobile UI perfetto
- [ ] PWA installabile
- [ ] LLM Router funzionante
- [ ] Onboarding dual-mode completo
- [ ] Schedule generation <30s
- [ ] CCNL compliance validato
- [ ] RLS policies attive
- [ ] Lighthouse score >90
- [ ] Nessun console error
- [ ] Monitoring attivo
- [ ] Documentation completa

---

**🚀 Production Ready quando:**
- [ ] Load testing completato
- [ ] Backup strategy implementata
- [ ] Support system attivo
- [ ] User documentation
- [ ] Admin training completato
- [ ] Marketing materials pronti
- [ ] Payment system integrato

---

## 🔧 TROUBLESHOOTING GUIDE

### Problemi Comuni e Soluzioni

#### 1. Schedule Generation Timeout

**Problema:** Generation impiega >30s

**Cause Possibili:**
- Database query non ottimizzate
- Troppi constraints attivi
- highs-js solver non ottimizzato

**Soluzioni:**
```typescript
// Aggiungi timeout e fallback
const solution = await Promise.race([
  solver.solve(employees, shifts, constraints),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 25000)
  )
]);

// Se timeout, usa algoritmo semplificato
if (error.message === 'Timeout') {
  return await simpleScheduleGeneration(employees, shifts);
}
```

**Ottimizzazioni Database:**
```sql
-- Aggiungi indexes per query frequenti
CREATE INDEX idx_shifts_date_position ON "Shift" (date, "positionId");
CREATE INDEX idx_assignments_shift_user ON "Assignment" ("shiftId", "userId");
CREATE INDEX idx_requests_user_status ON "Request" ("userId", status);
```

#### 2. LLM Router Cost Overrun

**Problema:** Costi LLM oltre budget

**Monitoraggio:**
```typescript
// lib/ai/usage-tracker.ts
export class UsageTracker {
  async trackTokens(usage: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }) {
    await db.llmUsage.create({ data: usage });
    
    // Check budget
    const monthlyUsage = await this.getMonthlyUsage();
    if (monthlyUsage.totalCost > process.env.MONTHLY_BUDGET) {
      await this.sendBudgetAlert();
      // Fallback to cheaper model
      return { shouldFallback: true };
    }
  }
}
```

**Strategie Cost Reduction:**
- Usa xAI Grok (più economico) per bulk operations
- Anthropic Claude solo per conversazioni complesse
- Cache prompt comuni
- Limita max_tokens per risposta

#### 3. Mobile Performance Issues

**Problema:** LCP >3s su mobile

**Diagnosi:**
```bash
# Lighthouse audit
npx lighthouse https://yourdomain.com --view --preset=mobile

# Bundle analyzer
npm install @next/bundle-analyzer
```

**Fix Comuni:**
```typescript
// 1. Lazy load componenti pesanti
const ScheduleCalendar = dynamic(() => import('@/components/calendar'), {
  loading: () => <CalendarSkeleton />,
  ssr: false,
});

// 2. Optimize images
import Image from 'next/image';
<Image 
  src="/hero.jpg" 
  width={800} 
  height={600} 
  priority 
  quality={75}
/>

// 3. Reduce JS bundle
// next.config.js
experimental: {
  optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
}
```

#### 4. RLS Policies Blocking Queries

**Problema:** Query falliscono con "permission denied"

**Debug RLS:**
```sql
-- Verifica policies attive
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test policy manualmente
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-id-here';
SELECT * FROM "Shift"; -- Dovrebbe funzionare
```

**Fix Policy Example:**
```sql
-- Policy troppo restrittiva
CREATE POLICY "Users view own data" ON "User"
  FOR SELECT TO authenticated
  USING (id = auth.uid()); -- ❌ Blocca tutto tranne user stesso

-- Policy corretta
CREATE POLICY "Users view own company data" ON "User"
  FOR SELECT TO authenticated
  USING ("companyId" = (
    SELECT "companyId" FROM "User" WHERE id = auth.uid()
  )); -- ✅ Permette visibilità colleghi
```

#### 5. i18n Missing Translations

**Problema:** Chiavi mancanti in produzioni

**Prevenzione:**
```typescript
// scripts/check-translations.ts
import it from './messages/it.json';
import en from './messages/en.json';

function checkTranslations() {
  const itKeys = new Set(Object.keys(flattenObject(it)));
  const enKeys = new Set(Object.keys(flattenObject(en)));
  
  const missingInEn = [...itKeys].filter(k => !enKeys.has(k));
  const missingInIt = [...enKeys].filter(k => !itKeys.has(k));
  
  if (missingInEn.length || missingInIt.length) {
    console.error('Missing translations:', { missingInEn, missingInIt });
    process.exit(1);
  }
}
```

**Run in CI:**
```yaml
# .github/workflows/ci.yml
- name: Check translations
  run: npm run check:translations
```

---

## 💡 BEST PRACTICES & TIPS

### Performance Optimization

**1. Database Query Optimization:**
```typescript
// ❌ BAD: N+1 queries
const schedules = await db.schedule.findMany();
for (const schedule of schedules) {
  const shifts = await db.shift.findMany({ 
    where: { scheduleId: schedule.id } 
  });
}

// ✅ GOOD: Single query with include
const schedules = await db.schedule.findMany({
  include: {
    shifts: {
      include: {
        assignments: {
          include: { user: true }
        }
      }
    }
  }
});
```

**2. API Response Caching:**
```typescript
// app/api/schedule/[id]/route.ts
export async function GET(req: Request, { params }) {
  const cacheKey = `schedule-${params.id}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return Response.json(JSON.parse(cached));
  
  // Fetch from DB
  const schedule = await db.schedule.findUnique({
    where: { id: params.id }
  });
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(schedule));
  
  return Response.json(schedule);
}
```

**3. Optimistic UI Updates:**
```typescript
// components/requests/request-list.tsx
async function handleDelete(requestId: string) {
  // Immediately update UI
  setRequests(prev => prev.filter(r => r.id !== requestId));
  
  try {
    await deleteRequest(requestId);
  } catch (error) {
    // Revert on error
    setRequests(prev => [...prev, deletedRequest]);
    toast.error('Errore durante l\'eliminazione');
  }
}
```

### Security Hardening

**1. Rate Limiting:**
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  return NextResponse.next();
}
```

**2. Input Validation:**
```typescript
// lib/validations/request.ts
import { z } from 'zod';

export const createRequestSchema = z.object({
  type: z.enum(['VACATION', 'SICK_LEAVE', 'PERMIT', 'REST_DAY']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be after start date' }
);

// Use in API route
export async function POST(req: Request) {
  const body = await req.json();
  const validated = createRequestSchema.parse(body); // Throws if invalid
  // ... proceed with validated data
}
```

**3. SQL Injection Prevention:**
```typescript
// ✅ ALWAYS use Prisma parameterized queries
await db.user.findMany({
  where: { email: userInput } // Safe - parameterized
});

// ❌ NEVER use raw SQL with string interpolation
await db.$executeRaw(`SELECT * FROM User WHERE email = '${userInput}'`); // Unsafe!

// ✅ If raw SQL needed, use parameters
await db.$executeRaw`SELECT * FROM User WHERE email = ${userInput}`; // Safe
```

### Code Quality

**1. Type Safety:**
```typescript
// ✅ Use strict TypeScript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}

// ✅ Define explicit types
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface Request {
  id: string;
  status: RequestStatus;
  createdAt: Date;
}

// ❌ Avoid 'any'
function process(data: any) { } // Bad

// ✅ Use specific types
function process(data: Request) { } // Good
```

**2. Error Boundaries:**
```typescript
// components/error-boundary.tsx
'use client';

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2>Qualcosa è andato storto</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**3. Logging Strategy:**
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty' }
  })
});

// Usage
logger.info({ userId, action: 'request_created' }, 'User created request');
logger.error({ error, context }, 'Schedule generation failed');
```

---

## 📚 REFERENCE DOCUMENTATION

### Critical Files Reference

**Environment Variables (.env.local):**
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# LLM Providers
XAI_API_KEY="xai-xxx"
OPENAI_API_KEY="sk-xxx"  # Optional fallback
ANTHROPIC_API_KEY="sk-ant-xxx"  # Optional fallback

# Inngest
INNGEST_EVENT_KEY="xxx"
INNGEST_SIGNING_KEY="xxx"

# Auth
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="https://yourdomain.com"

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"

# Feature Flags
ENABLE_AI_ONBOARDING="true"
LLM_MONTHLY_BUDGET="100"
```

### Useful Commands Cheatsheet

```bash
# Development
npm run dev                          # Start dev server
npm run build                        # Production build
npm run start                        # Start production server

# Database
npx prisma studio                    # Open Prisma Studio
npx prisma migrate dev               # Create migration
npx prisma migrate deploy            # Deploy migrations
npx prisma generate                  # Regenerate client
npx prisma db seed                   # Seed database

# Testing
npx playwright test                  # Run all tests
npx playwright test --ui             # UI mode
npx playwright test --project=mobile # Mobile tests only
npx playwright codegen               # Record new tests

# Deployment
vercel                               # Preview deployment
vercel --prod                        # Production deployment
vercel env add VAR_NAME              # Add env variable

# Quality
npm run lint                         # ESLint
npm run type-check                   # TypeScript check
npm run check:translations           # Check i18n

# Performance
npx lighthouse URL --view            # Lighthouse audit
npm run analyze                      # Bundle analyzer
```

### Key Endpoints Reference

```typescript
// API Routes
POST   /api/auth/login              // Login
POST   /api/auth/register           // Register
POST   /api/onboarding/ai           // AI onboarding message
POST   /api/onboarding/manual       // Manual onboarding submit
GET    /api/schedule/[id]           // Get schedule
POST   /api/schedule/generate       // Trigger generation
GET    /api/requests                // List requests
POST   /api/requests                // Create request
PATCH  /api/requests/[id]           // Update request
DELETE /api/requests/[id]           // Cancel request
GET    /api/availability            // Check slot availability
POST   /api/llm/chat                // LLM chat endpoint
GET    /api/admin/usage             // LLM usage stats
POST   /api/inngest                 // Inngest webhook
```

---

## 🎓 LEARNING RESOURCES

### For Developers

**Next.js 14 & App Router:**
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)

**Supabase & Prisma:**
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security)

**Testing:**
- [Playwright Documentation](https://playwright.dev)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)

**AI/LLM Integration:**
- [Anthropic Claude API](https://docs.anthropic.com)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [xAI Grok Docs](https://docs.x.ai/)

---

## 🏁 FINAL NOTES

### For Claude Code

**Prima di iniziare l'implementazione:**
1. ✅ Leggi TUTTO questo documento
2. ✅ Verifica prerequisiti e accessi
3. ✅ Setup environment variables
4. ✅ Run initial tests

**Durante l'implementazione:**
1. ⚡ Implementa 1 fase alla volta
2. 🧪 Testa dopo ogni step
3. 📝 Documenta modifiche significative
4. ❓ Chiedi credenziali SOLO quando servono
5. 🔄 Commit frequenti con conventional commits

**Conventional Commits Examples:**
```bash
feat(onboarding): add AI conversational flow
fix(calendar): resolve slot conflict detection
perf(schedule): optimize generation algorithm
docs(readme): update deployment instructions
test(requests): add mobile swipe gesture tests
```

**Quality Gates da Rispettare:**
- ✅ Tutti i test Playwright passano
- ✅ ESLint 0 errors, 0 warnings
- ✅ TypeScript 0 errors
- ✅ Lighthouse score >90 mobile
- ✅ Bundle size <500KB
- ✅ API response time <200ms p95

### Success Metrics

**Technical:**
- Uptime: 99.9%+
- Performance: LCP <2.5s mobile
- Error Rate: <0.1%
- Test Coverage: >80% critical paths

**Business:**
- Onboarding completion: >90%
- Daily active usage: 60%+ mobile
- Schedule generation success: >95%
- User satisfaction: >4.5/5

**AI Performance:**
- Onboarding completion rate: >85%
- AI suggestion acceptance: >70%
- Token usage within budget: Yes
- Response time <5s p95

---

## ✨ CONCLUSION

Questa guida fornisce tutte le informazioni necessarie per implementare Turnjob da zero. L'architettura è stata progettata per essere:

- 🚀 **Scalabile**: Supporta da 10 a 10.000+ utenti
- 🔐 **Sicura**: RLS, rate limiting, input validation
- 📱 **Mobile-First**: 60%+ traffic previsto da mobile
- 🌍 **Internazionale**: i18n IT/EN built-in
- 🤖 **AI-Powered**: Conversational onboarding unico nel mercato
- ⚡ **Performante**: <30s schedule generation, <2.5s LCP mobile

**Differenziatori Chiave vs Competitori:**
1. ✨ **AI Conversational Onboarding** (UNICO)
2. 🔄 **Dual-Mode**: AI-assisted O manuale (scelta utente)
3. 🇮🇹 **CCNL Compliance** automatizzato per mercato italiano
4. 💰 **LLM Router** configurabile per cost optimization
5. 📱 **PWA** installabile su iOS/Android

**Next Steps After Launch:**
- Monitor metrics giornalmente
- Raccogliere feedback utenti
- Iterare su AI prompts per migliorare acceptance rate
- Espandere language support (ES, FR, DE)
- Aggiungere integrations (Slack, Teams, Calendar)

---

**File:** turnjob-implementation-guide.md  
**Versione:** 3.0 (COMPLETA)  
**Ultima Modifica:** Novembre 2025  
**Per:** Claude Code Agent  
**Stato:** ✅ Ready for Implementation

🚀 **READY TO BUILD!**

## 📝 Note Implementazione per Claude Code

**Workflow Consigliato:**
1. Leggi TUTTO il documento prima di iniziare
2. Implementa 1 step alla volta
3. Testa SEMPRE dopo ogni step
4. Chiedi credenziali SOLO quando necessario
5. Run Playwright tests dopo ogni fase
6. Verifica mobile su ogni componente
7. Traduci IT/EN per ogni nuova feature

**Testing Checklist per Ogni Component:**
```bash
# Mobile viewport test
npx playwright test --project="Mobile Chrome"

# Desktop test
npx playwright test --project="chromium"

# Run specific test
npx playwright test tests/onboarding.spec.ts
```

**Debug Tips:**
- Usa Playwright UI mode: `npx playwright test --ui`
- Mobile debug: Chrome DevTools device toolbar
- i18n debug: Switch language in-app
- Database inspect: Supabase Studio

**Performance Targets:**
- Mobile LCP < 2.5s
- Desktop LCP < 1.5s
- Schedule generation < 30s
- API response < 200ms (p95)

---

## ✅ Completion Criteria

**App è production-ready quando:**
- [ ] Tutti i Playwright tests passano (mobile + desktop)
- [ ] i18n IT/EN completo su tutta l'app
- [ ] Mobile UI perfetto su iPhone/Android
- [ ] LLM Router funziona con budget control
- [ ] Onboarding dual-mode completo
- [ ] Schedule generation <30s consistente
- [ ] CCNL compliance validato
- [ ] Lighthouse score >90 mobile
- [ ] Nessun console error in produzione
- [ ] Database migrations documentate
- [ ] API documentation completa
- [ ] Admin UI LLM config funzionante

---

**File creato:** turnjob-implementation-guide.md
**Versione:** 2.0
**Ultima modifica:** Novembre 2025
**Per:** Claude Code Agent

🚀 **Pronto per iniziare l'implementazione step-by-step!**
