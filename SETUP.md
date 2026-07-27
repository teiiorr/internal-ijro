# SETUP

## Requirements
- Node.js 20.9+
- pnpm 10+
- PostgreSQL 16+

## PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
createdb ichki_ijro
psql ichki_ijro -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
```

## Environment

Copy `.env.example` to `.env.local` and adjust:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | NextAuth JWT secret (generate with `openssl rand -base64 32`) |
| `AUTH_URL` / `APP_URL` | Public URL of the app |
| `SMTP_HOST/PORT/USER/PASS/FROM/SECURE` | Mail transport (Mailpit recommended in dev: `docker run -p 8025:8025 -p 1025:1025 axllent/mailpit`) |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather (optional) |
| `TELEGRAM_WEBHOOK_SECRET` | Shared secret for Telegram webhook verification |
| `UPLOAD_DIR` | Where employee documents and deliverables are stored |
| `MAX_UPLOAD_BYTES` | Maximum upload size (default 50MB per TZ §10.3) |

## First run

```bash
pnpm install
pnpm db:migrate
pnpm db:seed            # optional demo data (users/projects) — aborts if users already exist
pnpm db:seed:templates  # the 9 project types + 7 stage templates (idempotent; safe to re-run anytime)
pnpm dev
```

Open http://localhost:3000. If you skipped the seed, `/setup` will appear and prompt you to create the first Direktor.

> `db:seed:templates` is required for the typed **Loyihalar** (project-stage) system — creating a project of one of the 9 types auto-builds its stage pipeline from these templates. Run it once after every migration; re-running only upserts names.

## Cron worker (stage deadline reminders)

`scripts/worker.ts` runs a single pass and exits: it notifies the responsible/curator of stages whose deadline is approaching, overdue, or stale (per-stage dedupe columns prevent repeat alerts). Run it on a schedule.

```bash
pnpm worker                      # one pass (dev)
# tuning (optional): WORKER_APPROACHING_DAYS=3 WORKER_STALE_DAYS=7
```

Production (systemd timer — daily 08:00 Asia/Tashkent):

```bash
# copy deploy/ichki-ijro-worker.{service,timer} into /etc/systemd/system/
systemctl enable --now ichki-ijro-worker.timer
```

## Telegram (Phase 2 — deferred)

Telegram delivery is wired as a dormant seam: `notify()` sends through Telegram only when `TELEGRAM_BOT_TOKEN` is set **and** the recipient has a linked `notificationSettings.telegramChatId`. The bot/webhook and the user-linking flow that captures each chat id are not built yet.

To enable later:
1. Create a bot via @BotFather, set `TELEGRAM_BOT_TOKEN`.
2. Build the linking flow (webhook capturing `chat_id`, or a Settings → Telegram code) that writes `notificationSettings.telegramChatId` and sets `telegramEnabled`.
   The delivery seam then activates automatically — see `src/lib/telegram/index.ts` and `src/lib/notifications/deliver.ts`.
