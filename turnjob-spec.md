# Turnjob - Specifiche Tecniche per SaaS di Gestione Turni Lavorativi

## 🎯 Overview del Progetto

Turnjob è una piattaforma SaaS per la gestione intelligente dei turni di lavoro, riposi, permessi e ferie aziendali. Il sistema permette ai collaboratori di richiedere giorni di assenza in base alla disponibilità dell'azienda e agli slot già occupati dai colleghi della stessa mansione.

---

## 📋 Requisiti Funzionali

### Ruoli Utente

#### Admin (Azienda)
- Configurare periodi di disponibilità (es. 2/3/4/5 riposi settimanali)
- Gestire mansioni/ruoli aziendali
- Impostare quote annuali per tipo di assenza (ferie, permessi, riposi)
- Visualizzare dashboard completa di tutti i turni
- Approvare/rifiutare richieste (opzionale)
- Gestire collaboratori e assegnarli a mansioni
- Esportare report e statistiche

#### Collaboratore (Dipendente)
- Visualizzare calendario disponibilità in tempo reale
- Richiedere riposi/permessi/ferie
- Vedere slot occupati dai colleghi della stessa mansione
- Visualizzare quote residue (giorni disponibili)
- Ricevere notifiche su approvazioni/rifiuti
- Modificare/cancellare richieste (se permesso)

### Logica di Business Core

1. **Sistema di Slot per Mansione**
   - Ogni mansione ha un limite di persone che possono essere assenti contemporaneamente
   - Il sistema previene sovrapposizioni basandosi sulla mansione del collaboratore
   - Calcolo real-time della disponibilità slot

2. **Gestione Quote Annuali**
   - Ferie: N giorni/anno (es. 22-26 giorni)
   - Permessi: N ore/giorni/anno (es. 72 ore)
   - Riposi: Configurabile settimanalmente/mensilmente
   - ROL (Riduzione Orario di Lavoro): Se applicabile

3. **Calendario Intelligente**
   - Vista settimanale/mensile/annuale
   - Indicatori di disponibilità in tempo reale
   - Codifica colori per stati (disponibile, parzialmente occupato, completo)
   - Filtri per mansione, tipo di assenza, collaboratore

4. **Validazioni e Regole**
   - Preavviso minimo per richieste (configurabile)
   - Blocco festività (configurabile)
   - Periodi di blackout (alta stagione, eventi critici)
   - Seniority rules (opzionale: priorità per anzianità)

---

## 🏗️ Architettura Tecnica

### Stack Tecnologico Raccomandato

```
Frontend:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (componenti UI)
- Zustand (state management)
- React Query / TanStack Query (data fetching)
- React Hook Form + Zod (form validation)
- date-fns o Day.js (date manipulation)

Backend:
- Next.js API Routes / Server Actions (per MVP)
- Oppure NestJS (per architettura più scalabile)
- TypeScript
- Prisma ORM

Database:
- PostgreSQL (via Supabase o Neon)
- Supabase per auth, realtime, storage

Autenticazione:
- NextAuth.js v5 (Auth.js) oppure Supabase Auth
- Row Level Security (RLS) per sicurezza dati

Notifiche:
- Resend (email)
- WebSockets per notifiche real-time (Supabase Realtime)

Hosting:
- Vercel (frontend + API)
- Supabase (database + auth + realtime)

Monitoring & Analytics:
- Vercel Analytics
- Sentry (error tracking)
- PostHog (product analytics)
```

### Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  EMPLOYEE
}

enum RequestType {
  VACATION    // Ferie
  PERMISSION  // Permessi
  DAY_OFF     // Riposo
  ROL         // Riduzione Orario Lavoro
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model Company {
  id                    String      @id @default(cuid())
  name                  String
  email                 String      @unique
  logo                  String?
  settings              Json        @default("{}")
  
  // Configurazioni globali
  minAdvanceNoticeDays  Int         @default(3)
  allowWeekendRequests  Boolean     @default(true)
  
  users                 User[]
  positions             Position[]
  timeOffPolicies       TimeOffPolicy[]
  blackoutPeriods       BlackoutPeriod[]
  
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
}

model User {
  id                String      @id @default(cuid())
  email             String      @unique
  name              String
  avatar            String?
  role              UserRole    @default(EMPLOYEE)
  
  companyId         String
  company           Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  positionId        String?
  position          Position?   @relation(fields: [positionId], references: [id])
  
  hireDate          DateTime?
  isActive          Boolean     @default(true)
  
  // Quote annuali personalizzate (override policies)
  customVacationDays    Int?
  customPermissionHours Int?
  
  requests          Request[]
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@index([companyId])
  @@index([positionId])
}

model Position {
  id                    String      @id @default(cuid())
  name                  String      // es. "Cameriere", "Cuoco", "Barista"
  description           String?
  color                 String      @default("#3b82f6") // per UI
  
  companyId             String
  company               Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Limite di assenze contemporanee per questa mansione
  maxSimultaneousAbsences Int       @default(1)
  
  users                 User[]
  
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  @@unique([companyId, name])
  @@index([companyId])
}

model TimeOffPolicy {
  id                    String      @id @default(cuid())
  
  companyId             String
  company               Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  year                  Int
  
  // Quote standard per l'anno
  vacationDays          Int         @default(22)      // Ferie
  permissionHours       Int         @default(72)      // Permessi (in ore)
  rolHours              Int         @default(0)       // ROL
  
  // Riposi settimanali (configurabili per periodo)
  weeklyDaysOffMin      Int         @default(2)
  weeklyDaysOffMax      Int         @default(3)
  
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  @@unique([companyId, year])
  @@index([companyId])
}

model Request {
  id                String          @id @default(cuid())
  
  userId            String
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type              RequestType
  status            RequestStatus   @default(PENDING)
  
  startDate         DateTime
  endDate           DateTime
  
  // Per permessi in ore
  hours             Float?
  
  notes             String?
  adminNotes        String?         // Note dell'admin
  
  // Metadata
  approvedBy        String?
  approvedAt        DateTime?
  rejectedReason    String?
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@index([userId])
  @@index([startDate, endDate])
  @@index([status])
}

model BlackoutPeriod {
  id                String      @id @default(cuid())
  
  companyId         String
  company           Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name              String      // es. "Festività Natalizie", "Alta Stagione Estiva"
  description       String?
  
  startDate         DateTime
  endDate           DateTime
  
  blockAllRequests  Boolean     @default(false)
  // Se false, può limitare solo certi tipi o ridurre gli slot
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@index([companyId])
  @@index([startDate, endDate])
}

model AuditLog {
  id                String      @id @default(cuid())
  
  userId            String?
  action            String      // es. "REQUEST_CREATED", "REQUEST_APPROVED"
  entityType        String      // es. "Request", "User"
  entityId          String
  
  changes           Json?       // Dati prima/dopo
  ipAddress         String?
  userAgent         String?
  
  createdAt         DateTime    @default(now())
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 🎨 UI/UX Design System

### Palette Colori - Turnjob Brand

```css
/* Colori Primari */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* Main Brand Color - Professional Blue */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;

/* Colori Secondari - Successo/Disponibilità */
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-500: #22c55e;  /* Slot Disponibile */
--success-600: #16a34a;
--success-700: #15803d;

/* Warning - Parzialmente Occupato */
--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-500: #f59e0b;  /* Slot Limitato */
--warning-600: #d97706;

/* Danger - Slot Completo */
--danger-50: #fef2f2;
--danger-100: #fee2e2;
--danger-500: #ef4444;  /* Slot Non Disponibile */
--danger-600: #dc2626;

/* Neutral - Backgrounds & Text */
--neutral-50: #f9fafb;
--neutral-100: #f3f4f6;
--neutral-200: #e5e7eb;
--neutral-300: #d1d5db;
--neutral-400: #9ca3af;
--neutral-500: #6b7280;
--neutral-600: #4b5563;
--neutral-700: #374151;
--neutral-800: #1f2937;
--neutral-900: #111827;

/* Stati Richieste */
--status-pending: #f59e0b;     /* Arancione */
--status-approved: #22c55e;    /* Verde */
--status-rejected: #ef4444;    /* Rosso */
--status-cancelled: #6b7280;   /* Grigio */
```

### Tipografia

```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Scala Tipografica */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Componenti UI Chiave

#### 1. Calendario Mensile
```typescript
// Caratteristiche:
- Vista griglia 7x5/6 (settimane)
- Indicatori di disponibilità per giorno
- Color coding per stati slot
- Hover states con tooltip info
- Click per selezionare periodo
- Legend per stati (disponibile, limitato, pieno)
```

#### 2. Card Richiesta
```typescript
interface RequestCard {
  type: 'VACATION' | 'PERMISSION' | 'DAY_OFF';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  dateRange: string;
  userInfo: {
    name: string;
    position: string;
    avatar: string;
  };
  actions: ['edit', 'delete', 'approve', 'reject'];
}
```

#### 3. Dashboard Widget
- Contatori quota residue (circular progress)
- Timeline prossime assenze
- Notifiche pending requests
- Quick stats team

#### 4. Form Richiesta
- Date range picker con validazione real-time
- Slot availability indicator
- Notes textarea
- Preview riepilogo
- Submit states

### Layout Struttura

```
┌─────────────────────────────────────────────┐
│ Header (Logo | Navigation | User Menu)      │
├─────────────────────────────────────────────┤
│                                             │
│  Sidebar          │   Main Content          │
│  - Dashboard      │   ┌──────────────────┐ │
│  - Calendario     │   │                  │ │
│  - Richieste      │   │   Page Content   │ │
│  - Team           │   │                  │ │
│  - Impostazioni   │   └──────────────────┘ │
│                   │                         │
└─────────────────────────────────────────────┘
```

### Responsive Breakpoints
```css
/* Mobile First Approach */
--mobile: 0px;        /* < 640px */
--tablet: 640px;      /* 640px - 1024px */
--desktop: 1024px;    /* 1024px - 1280px */
--wide: 1280px;       /* > 1280px */
```

---

## 🔐 Sicurezza e Best Practices

### Autenticazione
- JWT tokens con refresh token rotation
- Session management sicuro
- Rate limiting su API
- Password hashing con bcrypt/argon2

### Autorizzazione
- Row Level Security (RLS) su Supabase
- Middleware per protezione routes
- Role-based access control (RBAC)
- API route protection

### Data Validation
```typescript
// Esempio schema Zod per richiesta
import { z } from 'zod';

export const createRequestSchema = z.object({
  type: z.enum(['VACATION', 'PERMISSION', 'DAY_OFF', 'ROL']),
  startDate: z.date(),
  endDate: z.date(),
  hours: z.number().optional(),
  notes: z.string().max(500).optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "La data di fine deve essere successiva alla data di inizio",
});
```

### Performance
- React Query per caching intelligente
- Optimistic updates per UX immediata
- Lazy loading componenti
- Image optimization con Next.js Image
- Database indexes su colonne frequently queried

---

## 📱 Funzionalità Avanzate (Post-MVP)

1. **Mobile App (PWA)**
   - Push notifications
   - Offline mode
   - Add to home screen

2. **Integrazioni**
   - Export calendario Google/Outlook
   - Slack notifications
   - HR software integrations

3. **Analytics Dashboard Admin**
   - Trend analysis assenze
   - Team workload balance
   - Forecast planning capacity

4. **AI/ML Features**
   - Suggerimenti slot ottimali
   - Predizione conflitti
   - Auto-approval per richieste standard

5. **Multi-tenancy**
   - Gestione multiple companies
   - White-label options
   - Custom domains

---

## 🚀 Roadmap Sviluppo

### Phase 1: MVP (4-6 settimane)
- [ ] Setup progetto (Next.js + Supabase)
- [ ] Database schema & migrations
- [ ] Autenticazione (admin + employee)
- [ ] CRUD richieste base
- [ ] Calendario vista mensile
- [ ] Logica validazione slot per mansione
- [ ] Dashboard base (quote residue)
- [ ] UI/UX core components

### Phase 2: Enhancement (2-3 settimane)
- [ ] Sistema notifiche email
- [ ] Workflow approvazione richieste
- [ ] Periodi blackout
- [ ] Export report PDF/Excel
- [ ] Timeline vista team
- [ ] Settings azienda configurabili
- [ ] Audit log

### Phase 3: Optimization (2 settimane)
- [ ] Performance optimization
- [ ] Mobile responsive refinement
- [ ] Testing E2E (Playwright)
- [ ] Accessibility (WCAG AA)
- [ ] SEO optimization
- [ ] Documentation

### Phase 4: Launch (1 settimana)
- [ ] Beta testing con utenti reali
- [ ] Bug fixes
- [ ] Deploy produzione
- [ ] Monitoring & analytics setup

---

## 🧪 Testing Strategy

```typescript
// Unit Tests (Vitest)
- Logiche di business pure
- Validazioni form
- Utility functions

// Integration Tests (React Testing Library)
- Componenti UI con interazioni
- Form submissions
- API route handlers

// E2E Tests (Playwright)
- User flows completi
- Critical paths (creazione richiesta, approvazione)
- Cross-browser testing

// Performance Tests
- Lighthouse CI
- Bundle size monitoring
```

---

## 📊 Metriche di Successo

### KPIs Tecnici
- Page load time < 2s
- Time to Interactive < 3s
- Lighthouse score > 90
- API response time < 200ms (p95)
- Uptime > 99.5%

### KPIs Business
- User adoption rate
- Richieste processate/settimana
- Tempo medio approvazione
- Riduzione conflitti planning
- Customer satisfaction score (CSAT)

---

## 💡 Note Implementative

### Algoritmo Calcolo Disponibilità Slot

```typescript
async function checkSlotAvailability(
  positionId: string,
  startDate: Date,
  endDate: Date
): Promise<{ available: boolean; occupiedCount: number; maxAllowed: number }> {
  
  // 1. Recupera configurazione mansione
  const position = await db.position.findUnique({
    where: { id: positionId },
    select: { maxSimultaneousAbsences: true }
  });
  
  // 2. Conta richieste approvate nello stesso periodo per stessa mansione
  const overlappingRequests = await db.request.count({
    where: {
      user: {
        positionId: positionId
      },
      status: 'APPROVED',
      OR: [
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } }
          ]
        }
      ]
    }
  });
  
  // 3. Verifica disponibilità
  const available = overlappingRequests < position.maxSimultaneousAbsences;
  
  return {
    available,
    occupiedCount: overlappingRequests,
    maxAllowed: position.maxSimultaneousAbsences
  };
}
```

### Calcolo Quote Residue

```typescript
async function calculateRemainingQuota(
  userId: string,
  year: number,
  type: 'VACATION' | 'PERMISSION'
): Promise<number> {
  
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { 
      company: {
        include: {
          timeOffPolicies: {
            where: { year }
          }
        }
      },
      requests: {
        where: {
          status: 'APPROVED',
          type: type,
          startDate: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        }
      }
    }
  });
  
  // Policy aziendale (con possibile override utente)
  const policy = user.company.timeOffPolicies[0];
  const totalDays = type === 'VACATION' 
    ? (user.customVacationDays ?? policy.vacationDays)
    : (user.customPermissionHours ?? policy.permissionHours) / 8; // Converti ore in giorni
  
  // Calcola giorni già utilizzati
  const usedDays = user.requests.reduce((sum, req) => {
    const days = differenceInDays(req.endDate, req.startDate) + 1;
    return sum + days;
  }, 0);
  
  return Math.max(0, totalDays - usedDays);
}
```

---

## 🎯 Differenziatori Competitivi

1. **Real-time Slot Visibility**: Trasparenza immediata su disponibilità
2. **Conflict Prevention**: Sistema intelligente che previene sovrapposizioni
3. **Mansione-based Logic**: Gestione granulare per ruolo
4. **Mobile-first UX**: Accessibilità da smartphone
5. **Onboarding Rapido**: Setup azienda in < 10 minuti
6. **Pricing Trasparente**: No hidden costs

---

## 📚 Risorse e Reference

### Design Inspiration
- Linear (task management UX)
- Notion (calendar views)
- Calendly (slot booking)
- Slack (notifications & states)

### Tech Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [React Query](https://tanstack.com/query)

### Legal Compliance (Italia)
- CCNL riferimenti per ferie/permessi
- GDPR compliance per dati dipendenti
- Privacy policy e terms of service

---

## ✅ Checklist Pre-Launch

- [ ] Security audit completo
- [ ] GDPR compliance verificato
- [ ] Backup strategy implementata
- [ ] Error monitoring attivo (Sentry)
- [ ] Analytics setup (PostHog/Plausible)
- [ ] Email templates professionali
- [ ] Help documentation
- [ ] Pricing page e billing integration
- [ ] Legal pages (Privacy, Terms, Cookie Policy)
- [ ] SEO meta tags ottimizzati
- [ ] Social media preview cards
- [ ] Favicon e app icons

---

## 🎬 Getting Started con Claude Code

```bash
# 1. Inizializza il progetto
npx create-next-app@latest turnjob --typescript --tailwind --app

# 2. Setup Supabase
npx supabase init
npx supabase start

# 3. Installa dipendenze core
npm install @prisma/client prisma zod react-hook-form @hookform/resolvers
npm install @tanstack/react-query zustand date-fns
npm install @radix-ui/react-* (per shadcn/ui components)

# 4. Setup Prisma
npx prisma init
# Copia schema.prisma da questo documento
npx prisma migrate dev --name init

# 5. Genera componenti shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button calendar card form input

# 6. Struttura cartelle suggerita
/turnjob
  /app
    /(auth)
      /login
      /register
    /(dashboard)
      /dashboard
      /calendar
      /requests
      /team
      /settings
    /api
      /requests
      /users
      /positions
  /components
    /ui (shadcn)
    /calendar
    /requests
    /dashboard
  /lib
    /db (Prisma client)
    /validations (Zod schemas)
    /utils
  /hooks
  /types
  /styles
```

---

**Documento creato per**: Claude Code  
**Progetto**: Turnjob - SaaS Gestione Turni Lavorativi  
**Versione**: 1.0  
**Data**: Novembre 2025  
**Stack**: Next.js 14+ | TypeScript | Supabase | Prisma | Tailwind CSS

---

## 💼 Note Finali per Claude Code

Quando implementi questo progetto:

1. **Inizia con MVP**: Focus su funzionalità core prima di features avanzate
2. **Type Safety**: Usa TypeScript strict mode, definisci tutti i tipi
3. **Component Reusability**: Crea componenti atomici riutilizzabili
4. **Error Handling**: Implementa try-catch e error boundaries
5. **User Feedback**: Loading states, success/error messages, optimistic UI
6. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
7. **Performance**: Code splitting, lazy loading, memoization dove necessario
8. **Git Strategy**: Conventional commits, feature branches, PR reviews
9. **Testing**: Test critici (slot validation, quota calculation)
10. **Documentation**: JSDoc per funzioni complesse, README aggiornato

**Priorità implementative suggerite**:
1. Setup progetto + DB schema
2. Auth system (login admin/employee)
3. CRUD richieste base con validazioni
4. Calendario UI con slot availability logic
5. Dashboard con quota residue
6. Sistema notifiche
7. Admin panel configurazioni
8. Polish UI/UX e testing

Buon coding! 🚀
