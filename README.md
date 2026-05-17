# Ichki Ijro

Corporate task, project and HR management for BKRM. Implements the TZ in eight stages (see commit history).

## Quick start

```bash
pnpm install
cp .env.example .env.local
# edit DATABASE_URL etc.
pnpm db:migrate      # apply schema
pnpm db:seed         # demo data (optional)
pnpm dev             # http://localhost:3000
```

If the database has no users, visit `/setup` to create the first Direktor.

Demo seed creates these accounts (password `Password123!`):
`direktor@bkrm.local`, `hr@bkrm.local`, `koordinator@bkrm.local`, `boshlik@bkrm.local`, `spec1@bkrm.local`, `spec2@bkrm.local`, `contractor@example.com`.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run built app |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle migration from schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:seed` | Seed demo data |
| `pnpm tsx scripts/worker.ts` | Run cron worker (reminders, weekly PDF) |

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle ORM · Auth.js v5 · Tailwind v4 · shadcn-style UI · next-intl (uz-latn/uz-cyrl/ru/en) · grammY · ExcelJS · @react-pdf/renderer · node-cron · recharts · dnd-kit.

See [SETUP.md](./SETUP.md), [DATABASE.md](./DATABASE.md), [USERS.md](./USERS.md), [API.md](./API.md).
