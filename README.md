# Turnjob - Gestione Turni Intelligente

Piattaforma SaaS per la gestione di turni lavorativi, riposi, permessi e ferie aziendali.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Form Management**: React Hook Form + Zod
- **Date Utilities**: date-fns

## 📦 Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura Supabase

1. Crea un progetto su [Supabase](https://supabase.com)
2. Copia il file `.env.example` in `.env.local`:

```bash
cp .env.example .env.local
```

3. Compila le variabili d'ambiente in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 3. Setup Database con Prisma

```bash
# Genera il Prisma Client
npm run db:generate

# Push dello schema al database (per sviluppo rapido)
npm run db:push

# Oppure crea una migration (raccomandato per produzione)
npm run db:migrate
```

### 4. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## 📁 Struttura del Progetto

```
turnjob/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, register)
│   │   ├── (dashboard)/       # Dashboard routes protette
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── calendar/          # Calendar components
│   │   ├── requests/          # Request management components
│   │   ├── dashboard/         # Dashboard widgets
│   │   └── layout/            # Layout components
│   ├── lib/
│   │   ├── supabase/          # Supabase client config
│   │   ├── prisma.ts          # Prisma client
│   │   └── utils.ts           # Utility functions
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── styles/                # Global styles
├── prisma/
│   └── schema.prisma          # Database schema
└── public/                    # Static assets
```

## 🎯 Features Principali

### MVP (Phase 1)
- ✅ Auth system (Admin + Employee)
- ✅ Database schema completo
- 🔄 CRUD richieste (Ferie, Permessi, Riposi)
- 🔄 Calendario mensile con slot availability
- 🔄 Dashboard quote residue
- 🔄 Sistema validazione conflitti per mansione

### Phase 2
- [ ] Sistema notifiche email
- [ ] Workflow approvazione richieste
- [ ] Periodi blackout configurabili
- [ ] Export report (PDF/Excel)
- [ ] Admin panel configurazioni

## 🗄️ Database Schema

Il database include i seguenti modelli principali:

- **Company**: Dati azienda e configurazioni
- **User**: Utenti (Admin/Employee)
- **Position**: Mansioni/Ruoli
- **TimeOffPolicy**: Policy ferie/permessi per anno
- **Request**: Richieste di assenza
- **BlackoutPeriod**: Periodi di blocco richieste
- **AuditLog**: Log delle operazioni

## 🛠️ Scripts Disponibili

```bash
# Development
npm run dev              # Avvia dev server
npm run build            # Build per produzione
npm run start            # Avvia produzione build
npm run lint             # Linting

# Database
npm run db:generate      # Genera Prisma Client
npm run db:push          # Push schema senza migration
npm run db:migrate       # Crea migration
npm run db:studio        # Apri Prisma Studio
```

## 📚 Documentazione

Per la documentazione completa del progetto, consulta:
- [Specifiche Tecniche](./turnjob-spec.md) - Documento completo delle specifiche
- [Prisma Schema](./prisma/schema.prisma) - Schema database dettagliato

## 🤝 Contribuire

Questo è un progetto in fase di sviluppo iniziale. Contattami per contribuire.

## 📄 License

Proprietary - Tutti i diritti riservati
