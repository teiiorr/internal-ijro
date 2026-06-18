# Deployment — Ichki Ijro

Пошаговая инструкция для развёртывания на чистом Ubuntu 22.04/24.04 VPS
(UzCloud, Hetzner, DigitalOcean — без разницы).

## Что вам нужно перед началом

* VPS: **Ubuntu 22.04 LTS** или **24.04 LTS**, минимум **2 vCPU / 4 ГБ RAM / 40 ГБ SSD**
* Домен (например `ijro.bkrm.uz`), A-запись которого направлена на IP сервера
* SSH-доступ к серверу под `root` (или пользователем с `sudo`)
* Локально: `pnpm`, `node 22`, `git`, `ssh`, `scp`

---

## 1. Первичная установка сервера (один раз)

Зайдите на сервер и выполните:

```bash
# Скопировать репозиторий целиком — внутри он содержит deploy/
git clone https://github.com/YOUR_ORG/ichki-ijro.git /tmp/ichki-ijro
cd /tmp/ichki-ijro

# Запустить установщик. Идемпотентен — можно прерывать и запускать заново.
sudo bash deploy/setup-server.sh
```

Скрипт установит и настроит:

* Node.js 22 + pnpm
* PostgreSQL 16 + создаст БД `ichki_ijro` со случайным паролем
* Nginx + certbot
* systemd unit `ichki-ijro.service`
* firewall (ufw) — открыты только SSH и HTTP/HTTPS
* fail2ban
* пользователя `ichki-ijro` без shell-доступа
* `/srv/ichki-ijro/shared/.env.production` с уже подставленным DB-паролем и
  `AUTH_SECRET` (рандомные 32 байта)

В конце он напечатает следующие шаги.

## 2. Заполнить `.env.production`

```bash
sudo nano /srv/ichki-ijro/shared/.env.production
```

Минимум который нужно поправить:

* `APP_URL` и `AUTH_URL` → ваш реальный домен (`https://ijro.bkrm.uz`)
* `SMTP_*` — если хотите получать email-уведомления (можно оставить пустым)

## 3. Nginx + HTTPS

```bash
sudo cp /tmp/ichki-ijro/deploy/nginx.conf /etc/nginx/sites-available/ichki-ijro
sudo nano /etc/nginx/sites-available/ichki-ijro   # заменить ijro.bkrm.uz на ваш домен
sudo ln -sf /etc/nginx/sites-available/ichki-ijro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Выпустить Let's Encrypt сертификат (запросит email):
sudo certbot --nginx -d ijro.bkrm.uz
```

`certbot` сам поправит nginx config и настроит автообновление через cron.

## 4. Первый деплой (с вашего ноутбука)

С вашей рабочей машины из корня репозитория:

```bash
DEPLOY_HOST=root@SERVER_IP bash deploy/deploy.sh
```

Скрипт:

1. Соберёт проект локально (`pnpm install && pnpm test && pnpm build`)
2. Запакует только то что нужно для прода (`.next/standalone` + `public/` +
   `.next/static/` + миграции)
3. Закачает архив на сервер по SSH
4. Прогонит миграции БД
5. Атомарно переключит `current → releases/YYYYMMDD-HHMMSS`
6. Перезапустит `ichki-ijro.service`
7. Удалит старые релизы, оставит последние 5

Откройте `https://ijro.bkrm.uz` — должна появиться форма входа.

## 5. Создать первого Direktor'а

Зайдите на `/setup` один раз — система предложит создать первого
Direktor-а. После этого `/setup` сама редиректит на `/login`.

## 6. Ежедневные бэкапы (cron)

```bash
sudo crontab -e
```

Добавьте строку:

```
0 3 * * * /srv/ichki-ijro/current/deploy/backup.sh >> /var/log/ichki-backup.log 2>&1
```

Бэкапы лежат в `/var/backups/ichki-ijro/`, хранятся **14 дней** локально.

### Off-site бэкапы (опционально — настоятельно рекомендую)

Локальный бэкап на той же машине — это пол-решения. Зеркало в облако:

```bash
sudo apt install -y rclone
sudo rclone config        # настроить remote "b2:" (Backblaze) или "s3:" (Wasabi)
```

Раскомментируйте в `deploy/backup.sh` последнюю строчку с `rclone copy …`.

## 7. Обновление (последующие деплои)

С ноутбука после новых коммитов:

```bash
git pull
DEPLOY_HOST=root@SERVER_IP bash deploy/deploy.sh
```

Тот же скрипт — он сделает новый релиз, прогонит миграции (если есть),
переключит `current →` и перезапустит сервис. Старый релиз остаётся на
случай отката.

## Полезные команды на сервере

| Что нужно | Команда |
|---|---|
| Логи приложения | `journalctl -u ichki-ijro -f` |
| Статус сервиса | `systemctl status ichki-ijro` |
| Перезапуск | `systemctl restart ichki-ijro` |
| Логи nginx | `tail -f /var/log/nginx/access.log /var/log/nginx/error.log` |
| Подключиться к БД | `sudo -u postgres psql ichki_ijro` |
| Свободное место | `df -h /` |
| Откат на предыдущий релиз | `ls /srv/ichki-ijro/releases/` → `ln -sfn …` и `systemctl restart ichki-ijro` |

## Что куда положено

```
/srv/ichki-ijro/
  shared/.env.production    # секреты, переживают деплои
  releases/20260618-103022/ # каждый деплой — новая папка
  releases/20260619-091500/
  current → releases/...    # symlink на актуальный релиз
/var/lib/ichki-ijro/uploads/  # пользовательские файлы, не в репо
/var/backups/ichki-ijro/      # суточные бэкапы pg_dump + uploads.tar.gz
/etc/systemd/system/ichki-ijro.service
/etc/nginx/sites-available/ichki-ijro
```

## Аварийный откат

```bash
ssh root@SERVER_IP
cd /srv/ichki-ijro/releases
ls -1t                                   # увидеть список релизов
ln -sfn /srv/ichki-ijro/releases/PREV_TIMESTAMP /srv/ichki-ijro/current
systemctl restart ichki-ijro
```

Если поломалась БД — восстановить из бэкапа:

```bash
sudo -u postgres dropdb ichki_ijro
sudo -u postgres createdb -O ichki_ijro ichki_ijro
sudo -u postgres pg_restore -d ichki_ijro /var/backups/ichki-ijro/db-YYYYMMDD-HHMMSS.dump
systemctl restart ichki-ijro
```

## Минимальная проверка перед запуском в продакшен

* [ ] Открывается `https://ВАШДОМЕН` — видна форма входа
* [ ] `/setup` создал Direktor-а, после `/setup` редиректит
* [ ] Direktor может залогиниться
* [ ] Создаётся вазифа, можно открыть детальную страницу
* [ ] Загружается файл (deliverable / attachment) — он сохраняется в
      `/var/lib/ichki-ijro/uploads/`
* [ ] Появилась запись в `journalctl -u ichki-ijro` без ошибок
* [ ] `/api/notifications/unread-count` отвечает 401 если не авторизован,
      число — если авторизован
* [ ] Cron-бэкап отработал минимум один раз: `ls /var/backups/ichki-ijro/`
