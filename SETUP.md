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
pnpm db:seed          # optional demo data
pnpm dev
```

Open http://localhost:3000. If you skipped the seed, `/setup` will appear and prompt you to create the first Direktor.

## Cron worker

Reminders + weekly PDF mailing run inside a separate worker process so the web server isn't blocked:

```bash
pnpm tsx scripts/worker.ts
```

Schedule:
- every hour — task deadline reminders (24h ahead)
- 17:00 daily — standup reminders
- Monday 09:00 — weekly PDF report mailed to Direktors

## Telegram

1. Create bot via @BotFather, set `TELEGRAM_BOT_TOKEN`.
2. Set the webhook (must be HTTPS in production):
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://your-domain/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
3. In the app, go to Settings → Telegram, generate a code, then send it to the bot.
