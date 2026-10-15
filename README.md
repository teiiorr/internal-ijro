# Ichki Ijro

Corporate task, project and HR management for BKRM. Implements the TZ in eight stages (see commit history).

## Quick start

Requirements: Node.js 22, pnpm 10, PostgreSQL 16+.

```bash
pnpm install --frozen-lockfile
cp .env.example .env         # edit DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), AUTH_URL, APP_URL
createdb ichki_ijro          # empty database
pnpm db:push                 # create the full schema from src/lib/db (fresh database)
pnpm db:seed:templates       # stage templates and project types (recommended)
pnpm db:seed                 # demo data (optional)
pnpm dev                     # http://localhost:3000
```

Use `.env`, not `.env.local`: the database scripts (`db:push`, `db:seed`, `db:migrate`) load
`.env` through `dotenv`, and Next.js reads `.env` as well.

**Fresh database vs. existing one.** On a new, empty database use `pnpm db:push` — it builds the
complete schema straight from the Drizzle definitions. `pnpm db:migrate` only applies the
migrations recorded in `drizzle/migrations/meta/_journal.json` (up to `0024`); the later SQL files
(`0025`–`0043`) are idempotent and are applied to an existing production database by hand, in
order, with `psql "$DATABASE_URL" -f drizzle/migrations/NNNN_*.sql` (see [DEPLOY.md](./DEPLOY.md)).

If the database has no users, visit `/setup` to create the first Direktor.

The demo seed creates the organisation's staff accounts and three studio accounts, all with the
password defined in `scripts/seed.ts`; it prints the main logins when it finishes.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run built app |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle migration from schema |
| `pnpm db:migrate` | Apply journaled migrations (up to `0024`, see above) |
| `pnpm db:push` | Create/update the schema from the Drizzle definitions (fresh databases) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:seed:templates` | Seed stage templates and project types |
| `pnpm i18n:check` | Verify all four locales have the same message keys |
| `pnpm worker` | Run cron worker once (deadline reminders, weekly snapshot) |
| `pnpm test` | Run the Vitest suite |

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle ORM · Auth.js v5 (next-auth) · Tailwind v4 · Radix UI (shadcn-style) · next-intl (uz-latn/uz-cyrl/oz/ru) · react-hook-form + Zod · ExcelJS · @react-pdf/renderer · recharts · nodemailer (email) · otplib + qrcode (2FA) · sharp.

The cron worker (`scripts/worker.ts`) is a single-pass `tsx` script scheduled by a systemd timer in production — see [DEPLOY.md](./DEPLOY.md).

See [SETUP.md](./SETUP.md), [DATABASE.md](./DATABASE.md), [USERS.md](./USERS.md), [API.md](./API.md), [DEPLOY.md](./DEPLOY.md).
