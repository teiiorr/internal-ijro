# Деплой — Ichki Ijro (app.markaz-ijro.uz)

Короткий runbook для продакшена на DigitalOcean. Шаги, помеченные **🔑 root**,
требуют доступа к серверу под `root`/`sudo` — их выполняет человек один раз,
автоматический деплой их не делает.

> Значения ниже (`/opt/markaz-ijro`, юнит `markaz-ijro`, IP `64.226.65.211`,
> домен `app.markaz-ijro.uz`) — текущая боевая конфигурация. Конфиги в `deploy/`
> — **эталон в репозитории**; живой сервер мог быть поправлен вручную, поэтому
> перед изменениями сверяйтесь (`diff`) с тем, что реально лежит на сервере.

---

## Как это устроено

```
/opt/markaz-ijro/
  shared/.env.production        # секреты, переживают деплой
  releases/20261014-101500/     # каждый деплой — новая папка (полная сборка)
  releases/20261013-174500/
  current → releases/...        # symlink на активный релиз
/var/lib/markaz-ijro/uploads/   # файлы пользователей (вне релизов)
/var/backups/markaz-ijro/       # суточные бэкапы
```

* `current` указывает на **полную сборку**: `node_modules` + `.next` + `src/` +
  `scripts/` + `tsconfig.json`. Поэтому из одной папки работают и приложение
  (`next start`), и cron-воркер (`tsx scripts/worker.ts`).
* systemd: `markaz-ijro.service` (приложение) и `markaz-ijro-worker.service` +
  `.timer` (воркер). Эталоны — `deploy/markaz-ijro*.service` / `.timer`.
* nginx проксирует на `127.0.0.1:3000` (`deploy/nginx.conf`).
* **Сборка всегда на Linux** (CI-раннер или сам дроплет). Мы больше никогда не
  rsync-им `node_modules` с Mac на Linux — именно это раньше ломало нативные
  модули (sharp/esbuild) и воркер.

---

## 0. Разовая подготовка сервера — **🔑 root**

1. Node 22 + `corepack enable` (pnpm), PostgreSQL, nginx, `rsync`, `curl`.
   Для чистого сервера есть эталон `deploy/setup-server.sh` (обобщённый —
   учтите другое имя юнита/пути).
2. **Юнит приложения указывает на `current`.** Если боевой `markaz-ijro.service`
   раньше имел `WorkingDirectory=/opt/markaz-ijro/app`, поменяйте на
   `/opt/markaz-ijro/current` (это разовое изменение; без него свап релизов не
   подхватится):
   ```bash
   sudo cp deploy/markaz-ijro.service        /etc/systemd/system/
   sudo cp deploy/markaz-ijro-worker.service /etc/systemd/system/
   sudo cp deploy/markaz-ijro-worker.timer   /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now markaz-ijro.service
   sudo systemctl enable --now markaz-ijro-worker.timer
   ```
3. Секреты: создать `/opt/markaz-ijro/shared/.env.production` из
   `.env.production.example`, вписать `DATABASE_URL`, `AUTH_SECRET`,
   `APP_URL=https://app.markaz-ijro.uz`, `AUTH_URL`, `SMTP_*`. `chmod 600`.
4. Деплой-пользователю (`ijro`) разрешить рестарт без пароля — деплой это
   использует:
   ```
   # /etc/sudoers.d/markaz-ijro-deploy
   ijro ALL=(root) NOPASSWD: /bin/systemctl restart markaz-ijro, \
     /bin/systemctl restart markaz-ijro-worker.timer, \
     /bin/systemctl restart markaz-ijro-worker.service, \
     /bin/journalctl -u markaz-ijro *
   ```
5. nginx: `sudo cp deploy/nginx.conf /etc/nginx/sites-available/markaz-ijro`,
   включить, `nginx -t`, `certbot --nginx -d app.markaz-ijro.uz`.
6. Страница техработ: создать `/var/www/maintenance/index.html` (её отдаёт
   nginx при `502/503/504`, когда приложение рестартует/упало).

---

## ⚠ ВАЖНО: роут `/api/health` ещё не создан

Smoke-check после деплоя дёргает `https://app.markaz-ijro.uz/api/health` и
**проваливает деплой, если ответ не `200`**. Такого роута в `src/` пока нет
(он вне scope этого DevOps-пакета — трогать `src/` здесь нельзя).

**Что сделать (отдельной задачей, с доступом к `src/`):** добавить
`src/app/api/health/route.ts`. Минимальный вариант:

```ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
```

> Конвенции роутов в этой версии Next могли измениться — сверьтесь с
> `node_modules/next/dist/docs/` (см. `AGENTS.md`), прежде чем писать роут.

**Пока роута нет** — временно укажите smoke на публичную страницу логина:
`HEALTH_URL=https://app.markaz-ijro.uz/uz-latn/login bash deploy.sh`
(или задайте `HEALTH_URL` как repo variable для CI).

---

## 1. Деплой

### Вариант A — CI (основной)

`git push` в `main` (или `redesign-biib`, пока редизайн = прод) →
`.github/workflows/deploy.yml`:

1. собирает проект **на Linux-раннере** (`pnpm install --frozen-lockfile` +
   `pnpm build`);
2. заливает весь собранный релиз в `releases/<ts>` (включая `src/`, `scripts/`,
   `tsconfig.json` и linux-`node_modules` — поэтому воркер работает);
3. **gated-миграция** `pnpm db:migrate` — до переключения трафика;
4. атомарно `current → releases/<ts>`, рестарт `markaz-ijro` и таймера воркера;
5. smoke `GET /api/health` → `200`, иначе **авто-откат** и падение джоба.

Секреты GitHub: `DEPLOY_SSH_KEY` (обяз.), `DEPLOY_KNOWN_HOSTS` (опц., иначе
`ssh-keyscan`). Repo variables при необходимости: `DEPLOY_HOST`, `DEPLOY_PATH`,
`APP_SERVICE`, `WORKER_UNIT`, `UPLOADS_DIR`, `HEALTH_URL`, `SERVER_IP`.

### Вариант B — вручную с Mac (запасной / хотфикс)

```bash
bash deploy.sh
# или с переопределением:
DEPLOY_HOST=ijro@64.226.65.211 DEPLOY_PATH=/opt/markaz-ijro bash deploy.sh
```

Собирает **на дроплете** (гарантированно linux-сборка). ⚠ Дроплет 2 ГБ и делит
память с Postgres; `next build` хочет ~4 ГБ (2 ГБ RAM + 2 ГБ swap, который
ставит `setup-server.sh`). Работает, но для рутинных деплоев предпочтительнее CI.

Оба пути неинтерактивны, делают одно и то же на сервере (миграция → свап →
рестарт → smoke → откат при сбое).

---

## 2. Откат

* **Автоматически** — если smoke `/api/health` вернул не `200`, скрипт/CI сами
  вернут `current` на предыдущий релиз и перезапустят сервис.
* **Вручную** — **🔑 root/сервер**:
  ```bash
  ssh ijro@64.226.65.211
  ls -1t /opt/markaz-ijro/releases          # список релизов, свежие сверху
  ln -sfn /opt/markaz-ijro/releases/PREV_TS /opt/markaz-ijro/current
  sudo systemctl restart markaz-ijro
  curl -I https://app.markaz-ijro.uz/api/health
  ```
* Хранятся последние **5** релизов (старые чистятся автоматически).

---

## 3. Воркер (напоминания о сроках + недельный срез)

* `markaz-ijro-worker.service` (Type=oneshot, `pnpm worker`) запускается
  `markaz-ijro-worker.timer` **ежедневно в 08:00 Asia/Tashkent**
  (`Persistent=true` — догонит пропущенный запуск).
* Воркеру нужны `src/` + `tsconfig.json` + `tsx` (devDep) — деплой кладёт их в
  `current`, поэтому он работает (раньше `src/` не доезжал — воркер падал).
* **Проверка** — **🔑 сервер**:
  ```bash
  systemctl list-timers markaz-ijro-worker.timer      # когда следующий запуск
  journalctl -u markaz-ijro-worker -n 50 --no-pager   # лог последнего прогона
  sudo systemctl start markaz-ijro-worker.service     # прогнать прямо сейчас
  ```

---

## 4. Бэкап / восстановление БД — **🔑 root**

**Бэкап.** `deploy/backup.sh` делает `pg_dump` (custom format) + tar папки
uploads, чистит старше 14 дней. Поставить в cron:

```bash
sudo crontab -e
# 0 3 * * * /opt/markaz-ijro/current/deploy/backup.sh >> /var/log/markaz-backup.log 2>&1
```

Лежат в `/var/backups/markaz-ijro/`.

**Off-site (обязательно по-хорошему).** Локальная копия на той же машине — это
полдела. Настроить `rclone` и раскомментировать в `deploy/backup.sh` строку
`rclone copy …` (зеркало в Backblaze B2 / Wasabi S3):

```bash
sudo apt install -y rclone
sudo rclone config        # remote "b2:" или "s3:"
```

**Восстановление.**

```bash
# Схема (миграции применяются деплоем автоматически), данные — из дампа:
sudo -u postgres pg_restore --clean --if-exists --no-owner --no-acl \
  -d "$DATABASE_URL" /var/backups/markaz-ijro/db-YYYYMMDD-HHMMSS.dump
sudo systemctl restart markaz-ijro
```

Uploads восстанавливаются распаковкой соответствующего
`uploads-YYYYMMDD-HHMMSS.tar.gz` в `/var/lib/markaz-ijro/`.

---

## Полезные команды (на сервере)

| Что | Команда |
|---|---|
| Логи приложения | `journalctl -u markaz-ijro -f` |
| Статус | `systemctl status markaz-ijro` |
| Рестарт | `sudo systemctl restart markaz-ijro` |
| Health | `curl -I https://app.markaz-ijro.uz/api/health` |
| Логи nginx | `tail -f /var/log/nginx/{access,error}.log` |
| БД | `sudo -u postgres psql $DATABASE_URL` |
| Таймер воркера | `systemctl list-timers markaz-ijro-worker.timer` |
| Релизы | `ls -1t /opt/markaz-ijro/releases` |
| Место на диске | `df -h /` |

## Чек-лист перед «боевым» запуском

* [ ] Добавлен роут `/api/health` (см. раздел выше) — иначе smoke всегда красный.
* [ ] `markaz-ijro.service` → `WorkingDirectory=/opt/markaz-ijro/current`.
* [ ] `shared/.env.production` заполнен, `chmod 600`.
* [ ] Деплой (A или B) прошёл, smoke вернул `200`.
* [ ] `systemctl list-timers` показывает будущий запуск воркера.
* [ ] cron-бэкап отработал хотя бы раз: `ls /var/backups/markaz-ijro/`.
* [ ] Настроен off-site бэкап (rclone).
* [ ] Есть `/var/www/maintenance/index.html`.
