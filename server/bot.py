#!/usr/bin/env python3
"""Recipient store for idesighn.ru lead bot.

The VPS (Russia) cannot reach api.telegram.org, so the actual Telegram
sending/discovery is done in the visitor's browser. This service only keeps a
persistent list of recipient chat ids (people who started the bot):

  GET  /api/recipients          -> {"ok": true, "ids": ["..."]}
  POST /api/recipients          -> body {"add":[{"id","name"}], "remove":["id"]}
                                   merges into the store, returns {"ok",count}
  GET  /api/health              -> {"ok": true, "count": N}

Pure stdlib, no third-party deps.
"""

import json
import logging
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG = logging.getLogger("idesighn-bot")

DATA_DIR = os.environ.get("DATA_DIR", "/var/lib/idesighn-bot").strip()
SEED_CHATS = [c.strip() for c in os.environ.get("SEED_CHATS", "").split(",") if c.strip()]
HTTP_HOST = os.environ.get("HTTP_HOST", "127.0.0.1")
HTTP_PORT = int(os.environ.get("HTTP_PORT", "8090"))

SUBS_PATH = os.path.join(DATA_DIR, "subscribers.json")
ID_RE = re.compile(r"^-?\d{1,20}$")

_lock = threading.Lock()
_subs = {}  # chat_id(str) -> {"name": str, "ts": int}


def load_state():
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(SUBS_PATH):
        try:
            with open(SUBS_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                _subs.update({str(k): v for k, v in data.items()})
        except Exception as exc:  # noqa: BLE001
            LOG.warning("could not read subscribers: %s", exc)
    for cid in SEED_CHATS:
        _subs.setdefault(str(cid), {"name": "owner", "ts": int(time.time())})
    save_subs()
    LOG.info("loaded %d recipient(s)", len(_subs))


def save_subs():
    tmp = SUBS_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(_subs, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, SUBS_PATH)


def merge(add, remove):
    added, removed = 0, 0
    with _lock:
        for item in add or []:
            cid = str(item.get("id", "")).strip()
            if not ID_RE.match(cid):
                continue
            name = str(item.get("name", "") or cid)[:120]
            if cid not in _subs:
                added += 1
            _subs[cid] = {"name": name, "ts": int(time.time())}
        for rid in remove or []:
            cid = str(rid).strip()
            # never auto-drop the owner seed
            if cid in SEED_CHATS:
                continue
            if _subs.pop(cid, None) is not None:
                removed += 1
        if added or removed:
            save_subs()
    if added or removed:
        LOG.info("recipients merge: +%d -%d (total %d)", added, removed, len(_subs))
    return added, removed


class Handler(BaseHTTPRequestHandler):
    server_version = "idesighn-store/1.0"

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        LOG.info("http %s - %s", self.address_string(), fmt % args)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/health", "/api/health"):
            with _lock:
                self._json(200, {"ok": True, "count": len(_subs)})
        elif path in ("/recipients", "/api/recipients"):
            with _lock:
                ids = list(_subs.keys())
            self._json(200, {"ok": True, "ids": ids})
        else:
            self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path.split("?")[0] not in ("/recipients", "/api/recipients"):
            self._json(404, {"ok": False, "error": "not found"})
            return
        try:
            length = max(0, min(int(self.headers.get("Content-Length", "0")), 65536))
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            data = json.loads(raw or "{}")
        except Exception as exc:  # noqa: BLE001
            self._json(400, {"ok": False, "error": "bad request: %s" % exc})
            return
        add = data.get("add") or []
        remove = data.get("remove") or []
        if not isinstance(add, list) or not isinstance(remove, list):
            self._json(422, {"ok": False, "error": "add/remove must be lists"})
            return
        added, removed = merge(add[:200], remove[:200])
        with _lock:
            count = len(_subs)
        self._json(200, {"ok": True, "added": added, "removed": removed, "count": count})


def main():
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    load_state()
    httpd = ThreadingHTTPServer((HTTP_HOST, HTTP_PORT), Handler)
    LOG.info("recipient store on %s:%d", HTTP_HOST, HTTP_PORT)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
