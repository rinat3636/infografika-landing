#!/usr/bin/env bash
set -euo pipefail

TOKEN="$1"

# 1. Protected env file for the service
cat > /etc/idesighn-bot.env <<EOF
BOT_TOKEN=${TOKEN}
DATA_DIR=/var/lib/idesighn-bot
SEED_CHATS=8384059998
SITE_HOST=idesighn.ru
HTTP_HOST=127.0.0.1
HTTP_PORT=8090
EOF
chmod 600 /etc/idesighn-bot.env
chown root:root /etc/idesighn-bot.env

# 2. Apache reverse proxy modules
a2enmod proxy proxy_http >/dev/null 2>&1 || true

# 3. Add ProxyPass for /api/ into the SSL vhost (idempotent)
VHOST="$(readlink -f /etc/apache2/sites-enabled/idesighn-ssl.conf)"
if ! grep -q "ProxyPass /api/" "$VHOST"; then
  python3 - "$VHOST" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
block = (
    "  # Lead bot backend (Telegram subscribers)\n"
    "  ProxyPreserveHost On\n"
    "  ProxyPass /api/ http://127.0.0.1:8090/\n"
    "  ProxyPassReverse /api/ http://127.0.0.1:8090/\n"
)
s = s.replace("</VirtualHost>", block + "</VirtualHost>", 1)
open(p, "w").write(s)
print("vhost updated")
PY
else
  echo "vhost already has ProxyPass"
fi

# 4. Validate apache config and reload
apache2ctl configtest
systemctl reload apache2

# 5. systemd service
systemctl daemon-reload
systemctl enable idesighn-bot >/dev/null 2>&1 || true
systemctl restart idesighn-bot
sleep 3
echo "=== service status ==="
systemctl --no-pager --full status idesighn-bot | head -15 || true
echo "=== local health ==="
curl -s http://127.0.0.1:8090/health || true
echo
echo "=== recent logs ==="
journalctl -u idesighn-bot --no-pager -n 20 | tail -20 || true
