# ⚡ Quick Start - Turnjob

## 🚀 Setup Rapido (5 minuti)

### 1️⃣ Installa Dipendenze
```bash
npm install
```

### 2️⃣ Configura Environment
```bash
# Copia il file example
cp .env.example .env.local

# Modifica .env.local con le tue credenziali Supabase
# Vedi SETUP.md per dettagli
```

### 3️⃣ Setup Database
```bash
# Genera Prisma Client
npm run db:generate

# Push schema a Supabase
npm run db:push
```

### 4️⃣ Avvia Server
```bash
npm run dev
```

🎉 **Fatto!** Apri http://localhost:3000

---

## 🔑 Credenziali Supabase Necessarie

Crea un progetto su https://supabase.com e ottieni:

1. **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
2. **Anon Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`
4. **Database URL** → `DATABASE_URL` (Settings > Database)

---

## 📱 Struttura App

### Landing Page
```
http://localhost:3000
```
- Hero con CTA
- Features, How it Works, Pricing
- Footer con link

### Auth Pages
```
http://localhost:3000/login
http://localhost:3000/register
```

### Dashboard (Protetto)
```
http://localhost:3000/dashboard
```
- Overview stats
- Recent requests
- Quick actions

---

## 🛠️ Comandi Utili

```bash
# Development
npm run dev                # Avvia dev server

# Database
npm run db:generate        # Rigenera Prisma Client
npm run db:push           # Push schema changes
npm run db:studio         # Apri Prisma Studio (GUI)

# Production
npm run build             # Build per produzione
npm run start             # Avvia production build

# Code Quality
npm run lint              # ESLint check
```

---

## 🎨 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **UI**: shadcn/ui + Lucide Icons

---

## 📚 Documentazione

- [README.md](./README.md) - Overview progetto
- [SETUP.md](./SETUP.md) - Setup dettagliato
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Status e roadmap
- [turnjob-spec.md](./turnjob-spec.md) - Specifiche complete

---

## ❓ Troubleshooting

**Errore "Module not found"**
```bash
rm -rf node_modules
npm install
```

**Errore database connection**
```bash
# Verifica .env.local
cat .env.local

# Rigenera Prisma
npm run db:generate
```

**Port 3000 già in uso**
```bash
# Usa porta diversa
PORT=3001 npm run dev
```

---

**Pronto a sviluppare! 🚀**
