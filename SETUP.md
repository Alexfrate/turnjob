# 🚀 Setup Turnjob - Guida Rapida

## ✅ Prerequisiti

Prima di iniziare, assicurati di avere installato:

- **Node.js** (v18.17.0 o superiore)
- **npm** o **pnpm**
- Account **Supabase** (gratuito)

## 📦 Installazione

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura Supabase

#### A. Crea un progetto Supabase

1. Vai su [https://supabase.com](https://supabase.com)
2. Crea un nuovo progetto
3. Attendi che il database sia pronto

#### B. Ottieni le credenziali

Vai su **Project Settings > API** e copia:
- `URL` del progetto
- `anon/public` key
- `service_role` key (Settings > API)

Vai su **Project Settings > Database** e copia:
- Connection string (modalità "Transaction")

#### C. Configura le variabili d'ambiente

Crea il file `.env.local` nella root del progetto:

```bash
cp .env.example .env.local
```

Compila `.env.local` con i tuoi dati:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Database (Supabase Postgres)
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Database con Prisma

```bash
# Genera il Prisma Client
npm run db:generate

# Push dello schema al database
npm run db:push
```

**Nota**: `db:push` è perfetto per sviluppo. Per produzione usa `db:migrate`.

### 4. Configura Supabase Auth (Opzionale)

Per abilitare la conferma email:

1. Vai su **Authentication > Email Templates** in Supabase
2. Personalizza i template email se necessario
3. Abilita "Confirm email" in **Authentication > Providers > Email**

### 5. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser! 🎉

## 🎨 Struttura Completata

```
✅ Landing Page moderna e responsive
✅ Sezioni: Hero, Features, How it Works, Pricing, CTA
✅ Login/Register con Supabase Auth
✅ Dashboard layout con sidebar e header
✅ Database schema completo (Prisma)
✅ Design system Turnjob personalizzato
```

## 📝 Prossimi Step di Sviluppo

Dopo il setup, puoi sviluppare:

1. **Calendario Mensile** - Componente calendario con slot availability
2. **Request Management** - CRUD completo per richieste ferie/permessi
3. **Team Management** - Gestione collaboratori e mansioni
4. **Notifications** - Sistema notifiche email con Resend
5. **Reports** - Export PDF/Excel delle statistiche

## 🛠️ Scripts Disponibili

```bash
npm run dev          # Sviluppo (localhost:3000)
npm run build        # Build produzione
npm run start        # Avvia build produzione
npm run lint         # Linting

# Database
npm run db:generate  # Genera Prisma Client
npm run db:push      # Push schema (dev)
npm run db:migrate   # Crea migration (prod)
npm run db:studio    # Apri Prisma Studio
```

## 🐛 Troubleshooting

### Errore "Invalid Prisma Schema"
```bash
npm run db:generate
```

### Errore "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database connection error
- Verifica che `DATABASE_URL` e `DIRECT_URL` siano corretti
- Controlla che il database Supabase sia attivo
- Verifica la password nella connection string

## 📚 Risorse

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

## 🎯 Best Practices

- **Mai committare `.env.local`** (già in .gitignore)
- Usa `db:migrate` in produzione invece di `db:push`
- Testa sempre le migrazioni in ambiente di staging
- Abilita Row Level Security (RLS) in Supabase per produzione

---

**Hai problemi?** Controlla il file `README.md` o contattami!
