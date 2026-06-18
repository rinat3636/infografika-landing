# Сервис получателей заявок (idesighn.ru)

Маленький сервис на VPS, который хранит **постоянный список получателей** заявок
из Telegram-бота `@Infographicvv_bot`.

## Зачем он нужен

VPS находится в РФ и **не имеет доступа к `api.telegram.org`** (заблокирован).
Поэтому:

- **Отправка заявок в Telegram идёт из браузера посетителя** (см. `script.js`,
  функции `discoverRecipients` / `getRecipients` / `sendOne`).
- Этот сервис **не обращается к Telegram вообще** — он только хранит список
  chat-id получателей и отдаёт/принимает его по HTTP.

Кто подписан: любой, кто открыл бота и написал ему (нажал «Старт»), попадает в
список (его находит браузер через `getUpdates` и пишет сюда). Слово «стоп» —
удаляет из списка. Владелец (`SEED_CHATS`) присутствует всегда.

## API (проксируется Apache: `https://idesighn.ru/api/...` → `127.0.0.1:8090`)

- `GET  /api/recipients` → `{"ok":true,"ids":["..."]}`
- `POST /api/recipients` тело `{"add":[{"id","name"}],"remove":["id"]}`
- `GET  /api/health` → `{"ok":true,"count":N}`

## Установка на VPS

```bash
# 1. файлы
install -d /opt/idesighn-bot
cp bot.py /opt/idesighn-bot/bot.py
cp idesighn-bot.service /etc/systemd/system/idesighn-bot.service

# 2. настройка + apache-прокси + запуск (TOKEN нужен только как идентификатор,
#    сервис в Telegram не ходит)
bash install.sh "<BOT_TOKEN>"
```

`install.sh` создаёт `/etc/idesighn-bot.env` (chmod 600), включает модули Apache
`proxy`/`proxy_http`, добавляет `ProxyPass /api/ → 127.0.0.1:8090` в SSL-vhost и
поднимает systemd-сервис `idesighn-bot`.

Данные (список получателей) хранятся в `/var/lib/idesighn-bot/subscribers.json`.
