#!/usr/bin/env python3
"""VaLocker local app server: static files, SQLite users, sessions, and picks."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from export_docx import build_locker_docx, sanitize_groups

ROOT = Path(__file__).resolve().parent
COOKIE_NAME = "valocker_session"


def db_path() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/valocker.db")
    return ROOT / "valocker.db"


DB_PATH = db_path()
SESSION_DAYS = 30
PBKDF2_ROUNDS = 200_000
HOST = "127.0.0.1"
PORT = 4173
OWNER_USERNAME = "zapirpi"
OWNER_PASSWORD = "956230"
LEGACY_ACCOUNT = "uratadhi#NESON"
LEGACY_RIOT = "AhmadDrizzy"

_db_lock = threading.Lock()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        (table,),
    ).fetchone()
    if not exists:
        return set()
    return {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS picks (
            user_id INTEGER NOT NULL,
            pick_key TEXT NOT NULL,
            skin_name TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, pick_key),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS labels (
            user_id INTEGER NOT NULL,
            pick_key TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '',
            slant INTEGER NOT NULL DEFAULT 0,
            bold INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, pick_key),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """
    )


def legacy_owner_picks(conn: sqlite3.Connection) -> list[tuple[str, str, str]]:
    cols = table_columns(conn, "users")
    if "account" not in cols or "riot_username" not in cols:
        return []
    row = conn.execute(
        """
        SELECT id FROM users
        WHERE lower(account) = lower(?) AND lower(riot_username) = lower(?)
        """,
        (LEGACY_ACCOUNT, LEGACY_RIOT),
    ).fetchone()
    if not row:
        return []
    picks = conn.execute(
        "SELECT pick_key, skin_name, updated_at FROM picks WHERE user_id = ?",
        (row["id"],),
    ).fetchall()
    return [(pick["pick_key"], pick["skin_name"], pick["updated_at"]) for pick in picks]


def rebuild_auth_tables(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA foreign_keys = OFF")
    conn.executescript(
        """
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS picks;
        DROP TABLE IF EXISTS labels;
        """
    )
    conn.execute("PRAGMA foreign_keys = ON")
    ensure_schema(conn)


def seed_owner(conn: sqlite3.Connection, inherited_picks: list[tuple[str, str, str]] | None = None) -> None:
    salt, digest = hash_password(OWNER_PASSWORD)
    row = conn.execute(
        "SELECT id FROM users WHERE lower(username) = lower(?)",
        (OWNER_USERNAME,),
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?",
            (salt, digest, row["id"]),
        )
        user_id = row["id"]
    else:
        cursor = conn.execute(
            """
            INSERT INTO users (username, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (OWNER_USERNAME, salt, digest, iso(utc_now())),
        )
        user_id = cursor.lastrowid
    for pick_key, skin_name, updated_at in inherited_picks or []:
        conn.execute(
            """
            INSERT INTO picks (user_id, pick_key, skin_name, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, pick_key) DO UPDATE SET
                skin_name = excluded.skin_name,
                updated_at = excluded.updated_at
            """,
            (user_id, pick_key, skin_name, updated_at),
        )


def init_db() -> None:
    with _db_lock:
        conn = connect()
        try:
            cols = table_columns(conn, "users")
            inherited: list[tuple[str, str, str]] = []
            if cols and "username" not in cols:
                inherited = legacy_owner_picks(conn)
                rebuild_auth_tables(conn)
            else:
                ensure_schema(conn)
            seed_owner(conn, inherited)
            conn.commit()
        finally:
            conn.close()


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ROUNDS)
    return salt.hex(), digest.hex()


def normalize_username(username: str) -> str:
    return username.strip()


def user_public(row: sqlite3.Row) -> dict:
    return {"username": row["username"]}


def cookie_token(raw: str | None) -> str | None:
    if not raw:
        return None
    cookie = SimpleCookie()
    cookie.load(raw)
    morsel = cookie.get(COOKIE_NAME)
    return morsel.value if morsel else None


def current_user_from_cookie(raw: str | None) -> sqlite3.Row | None:
    token = cookie_token(raw)
    if not token:
        return None
    now = utc_now()
    with _db_lock:
        conn = connect()
        try:
            row = conn.execute(
                """
                SELECT users.*, sessions.expires_at
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = ?
                """,
                (token,),
            ).fetchone()
            if not row:
                return None
            if parse_iso(row["expires_at"]) <= now:
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
                conn.commit()
                return None
            return row
        finally:
            conn.close()


def create_session_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = iso(utc_now() + timedelta(days=SESSION_DAYS))
    with _db_lock:
        conn = connect()
        try:
            conn.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
                (token, user_id, expires),
            )
            conn.commit()
        finally:
            conn.close()
    return token


class VaLockerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "public"), **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), format % args))

    def cors_origin(self) -> str | None:
        origin = self.headers.get("Origin")
        if not origin:
            return None
        parsed = urlparse(origin)
        if parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost"}:
            return origin
        return None

    def apply_cors(self) -> None:
        origin = self.cors_origin()
        if not origin:
            return
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Vary", "Origin")

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload: dict, status: int = HTTPStatus.OK, extra_headers: list[tuple[str, str]] | None = None) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.apply_cors()
        if extra_headers:
            for key, value in extra_headers:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, payload: bytes, content_type: str, filename: str, status: int = HTTPStatus.OK) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.apply_cors()
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("JSON object required")
        return data

    def session_cookie_header(self, token: str | None, clear: bool = False) -> str:
        secure = "; Secure" if os.environ.get("VERCEL") else ""
        if clear or not token:
            return f"{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0{secure}"
        max_age = SESSION_DAYS * 24 * 60 * 60
        return f"{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}"

    def current_token(self) -> str | None:
        return cookie_token(self.headers.get("Cookie"))

    def current_user(self) -> sqlite3.Row | None:
        return current_user_from_cookie(self.headers.get("Cookie"))

    def create_session(self, user_id: int) -> str:
        return create_session_token(user_id)

    def do_OPTIONS(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown API route")
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self.apply_cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/session":
            user = self.current_user()
            if not user:
                self.send_json({"user": None})
                return
            self.send_json({"user": user_public(user)})
            return
        if parsed.path == "/api/identity":
            qs = parse_qs(parsed.query)
            username = normalize_username((qs.get("username") or [""])[0])
            if not username:
                self.send_json({"exists": False})
                return
            with _db_lock:
                conn = connect()
                try:
                    row = conn.execute(
                        "SELECT id FROM users WHERE lower(username) = lower(?)",
                        (username,),
                    ).fetchone()
                finally:
                    conn.close()
            self.send_json({"exists": bool(row)})
            return
        if parsed.path == "/api/picks":
            user = self.current_user()
            if not user:
                self.send_json({"error": "Not logged in"}, HTTPStatus.UNAUTHORIZED)
                return
            with _db_lock:
                conn = connect()
                try:
                    rows = conn.execute(
                        "SELECT pick_key, skin_name FROM picks WHERE user_id = ?",
                        (user["id"],),
                    ).fetchall()
                    label_rows = conn.execute(
                        "SELECT pick_key, color, slant, bold FROM labels WHERE user_id = ?",
                        (user["id"],),
                    ).fetchall()
                finally:
                    conn.close()
            picks = {row["pick_key"]: row["skin_name"] for row in rows}
            labels = {
                row["pick_key"]: {
                    "color": row["color"] or "",
                    "slant": bool(row["slant"]),
                    "bold": bool(row["bold"]),
                }
                for row in label_rows
            }
            self.send_json({"picks": picks, "labels": labels})
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        routes = {
            "/api/register": self.handle_register,
            "/api/login": self.handle_login,
            "/api/logout": self.handle_logout,
            "/api/picks": self.handle_save_pick,
            "/api/export": self.handle_export,
        }
        handler = routes.get(parsed.path)
        if not handler:
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown API route")
            return
        try:
            handler()
        except ValueError as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, HTTPStatus.BAD_REQUEST)

    def handle_register(self) -> None:
        body = self.read_json()
        username = normalize_username(str(body.get("username") or ""))
        password = str(body.get("password") or "")
        if not username:
            raise ValueError("Username is required")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")

        salt, digest = hash_password(password)
        with _db_lock:
            conn = connect()
            try:
                existing = conn.execute(
                    "SELECT id FROM users WHERE lower(username) = lower(?)",
                    (username,),
                ).fetchone()
                if existing:
                    self.send_json({"error": "That username already exists"}, HTTPStatus.CONFLICT)
                    return
                cursor = conn.execute(
                    """
                    INSERT INTO users (username, password_salt, password_hash, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (username, salt, digest, iso(utc_now())),
                )
                conn.commit()
                user_id = cursor.lastrowid
            finally:
                conn.close()
        token = self.create_session(user_id)
        self.send_json(
            {"user": {"username": username}},
            extra_headers=[("Set-Cookie", self.session_cookie_header(token))],
        )

    def handle_login(self) -> None:
        body = self.read_json()
        username = normalize_username(str(body.get("username") or ""))
        password = str(body.get("password") or "")
        with _db_lock:
            conn = connect()
            try:
                user = conn.execute(
                    "SELECT * FROM users WHERE lower(username) = lower(?)",
                    (username,),
                ).fetchone()
            finally:
                conn.close()
        if not user:
            self.send_json({"error": "Username or password is wrong"}, HTTPStatus.UNAUTHORIZED)
            return
        _, digest = hash_password(password, user["password_salt"])
        if not secrets.compare_digest(digest, user["password_hash"]):
            self.send_json({"error": "Username or password is wrong"}, HTTPStatus.UNAUTHORIZED)
            return
        token = self.create_session(user["id"])
        self.send_json(
            {"user": user_public(user)},
            extra_headers=[("Set-Cookie", self.session_cookie_header(token))],
        )

    def handle_logout(self) -> None:
        token = self.current_token()
        if token:
            with _db_lock:
                conn = connect()
                try:
                    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
                    conn.commit()
                finally:
                    conn.close()
        self.send_json({"ok": True}, extra_headers=[("Set-Cookie", self.session_cookie_header(None, clear=True))])

    def handle_save_pick(self) -> None:
        user = self.current_user()
        if not user:
            self.send_json({"error": "Not logged in"}, HTTPStatus.UNAUTHORIZED)
            return
        body = self.read_json()
        picks = body.get("picks")
        if not isinstance(picks, dict):
            raise ValueError("Picks are required")
        cleaned = []
        for key, name in picks.items():
            pick_key = str(key).strip()
            skin_name = str(name or "").strip()
            if not pick_key or ":" not in pick_key or not skin_name:
                continue
            cleaned.append((pick_key, skin_name))
        pick_keys = {pick_key for pick_key, _skin_name in cleaned}
        label_items = []
        raw_labels = body.get("labels")
        if isinstance(raw_labels, dict):
            allowed = {
                "warpath",
                "beastly",
                "archetype",
                "derivation",
                "minimal",
                "technological",
                "whimsical",
                "cartoonish",
            }
            for key, raw in raw_labels.items():
                pick_key = str(key).strip()
                if pick_key not in pick_keys or not isinstance(raw, dict):
                    continue
                color = str(raw.get("color") or "").strip().lower()
                if color not in allowed:
                    color = ""
                slant = 1 if raw.get("slant") else 0
                bold = 1 if raw.get("bold") else 0
                if not color and not slant and not bold:
                    continue
                label_items.append((pick_key, color, slant, bold))
        now = iso(utc_now())
        with _db_lock:
            conn = connect()
            try:
                conn.execute("DELETE FROM picks WHERE user_id = ?", (user["id"],))
                conn.executemany(
                    """
                    INSERT INTO picks (user_id, pick_key, skin_name, updated_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    [(user["id"], pick_key, skin_name, now) for pick_key, skin_name in cleaned],
                )
                if isinstance(raw_labels, dict):
                    conn.execute("DELETE FROM labels WHERE user_id = ?", (user["id"],))
                    conn.executemany(
                        """
                        INSERT INTO labels (user_id, pick_key, color, slant, bold)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        [(user["id"], pick_key, color, slant, bold) for pick_key, color, slant, bold in label_items],
                    )
                conn.commit()
            finally:
                conn.close()
        self.send_json({"ok": True})

    def handle_export(self) -> None:
        user = self.current_user()
        if not user:
            self.send_json({"error": "Not logged in"}, HTTPStatus.UNAUTHORIZED)
            return
        body = self.read_json()
        groups = sanitize_groups(body.get("groups"))
        username = str(user["username"])
        payload = build_locker_docx(username, groups)
        safe = "".join(ch for ch in username if ch.isalnum() or ch in "-_") or "valocker"
        self.send_bytes(
            payload,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            f"{safe}-valocker.docx",
        )


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), VaLockerHandler)
    print(f"VaLocker running at http://{HOST}:{PORT}/index.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped")
        server.server_close()


if __name__ == "__main__":
    main()
