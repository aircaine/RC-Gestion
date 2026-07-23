# RC-Gestion

Plateforme de gestion pour restaurant. **Module V1 : Heures** — déclaration a posteriori, calcul automatique, confirmation manager.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma 7 + Neon (Postgres) via `@prisma/adapter-neon`
- Auth.js (NextAuth v5) — email / mot de passe
- Déploiement cible : **Vercel**

## Fonctionnalités

| Rôle | Capacités |
|------|-----------|
| **Employé** | Se connecter, déclarer date + début/fin, lier à un shift ou hors planning, voir l’historique |
| **Manager** | Employés, planning (shifts), confirmer / corriger / rejeter, totaux compta + export CSV |

## Setup local

### 1. Neon

1. Créer un projet sur [neon.tech](https://neon.tech)
2. Dans **Connect**, copier :
   - l’URL **pooled** (`…-pooler…`) → `DATABASE_URL`
   - l’URL **direct** → `DIRECT_URL`

### 2. Variables d’environnement

```bash
cp .env.example .env
```

Renseigner :

```env
DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require"
DIRECT_URL="postgresql://…/neondb?sslmode=require"
AUTH_SECRET="…"   # openssl rand -base64 32
AUTH_URL="http://localhost:3000"
```

### 3. Installer, migrer, seed

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### Comptes de démo (seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Manager | `manager@rc-gestion.local` | `password123` |
| Employé | `employe1@rc-gestion.local` | `password123` |
| Employé | `employe2@rc-gestion.local` | `password123` |

## Déploiement Vercel

1. Pousser le repo sur GitHub
2. Importer le projet dans Vercel
3. Ajouter les env : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` (URL de prod)
4. Build command (défaut) : `prisma generate && next build` (déjà dans `package.json`)
5. Après le premier deploy, exécuter les migrations :

```bash
npx prisma migrate deploy
npm run db:seed
```

(ou via `vercel env pull` + CLI en local pointant sur Neon prod)

## Structure

```
app/
  login/                 # Connexion
  heures/                # Espace employé
  manager/               # Backend manager (dashboard, employés, planning, heures, compta)
  api/auth/              # Auth.js
modules/
  time-tracking/         # Déclarations & calcul heures
  auth/                  # Login / rôles
  manager/               # CRUD employés & shifts
prisma/                  # Schéma + migrations + seed
```

## Scripts utiles

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Generate Prisma client + build Next |
| `npm run db:migrate` | Appliquer migrations (`migrate deploy`) |
| `npm run db:seed` | Comptes de démo |
| `npm run db:generate` | `prisma generate` |
