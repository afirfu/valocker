"""SQLite locally, Supabase when SUPABASE_URL + SUPABASE_SECRET_KEY are set."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
_db_lock = threading.Lock()


def load_env() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env()


def use_supabase() -> bool:
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SECRET_KEY"))


def db_path() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/valocker.db")
    return ROOT / "valocker.db"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _as_dict(row: Any) -> dict:
    if row is None:
        return {}
    if isinstance(row, dict):
        return row
    return {key: row[key] for key in row.keys()}


def _sb_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    key = os.environ["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _sb_root() -> str:
    url = os.environ["SUPABASE_URL"].strip().rstrip("/")
    if url.endswith("/rest/v1"):
        url = url[: -len("/rest/v1")]
    return url


def _sb_url(table: str, query: str = "") -> str:
    base = _sb_root() + "/rest/v1/" + table
    return f"{base}?{query}" if query else base


def _sb_request(method: str, table: str, query: str = "", body: Any = None, extra: dict[str, str] | None = None) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(_sb_url(table, query), data=data, method=method, headers=_sb_headers(extra))
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read()
            return json.loads(raw.decode("utf-8")) if raw else []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise ValueError(detail or f"Supabase {method} {table} failed ({error.code})") from error


def find_user(username: str) -> dict | None:
    username = username.strip()
    if not username:
        return None
    if use_supabase():
        rows = _sb_request("GET", "users", f"username=ilike.{urllib.parse.quote(username)}&select=*")
        return rows[0] if rows else None
    with _db_lock:
        conn = connect()
        try:
            row = conn.execute(
                "SELECT * FROM users WHERE lower(username) = lower(?)",
                (username,),
            ).fetchone()
            return _as_dict(row) if row else None
        finally:
            conn.close()


def user_exists(username: str) -> bool:
    return find_user(username) is not None


def create_user(username: str, password_salt: str, password_hash: str, created_at: str) -> int:
    if use_supabase():
        rows = _sb_request(
            "POST",
            "users",
            body={"username": username, "password_salt": password_salt, "password_hash": password_hash, "created_at": created_at},
            extra={"Prefer": "return=representation"},
        )
        return int(rows[0]["id"])
    with _db_lock:
        conn = connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO users (username, password_salt, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (username, password_salt, password_hash, created_at),
            )
            conn.commit()
            return int(cursor.lastrowid)
        finally:
            conn.close()


def user_from_session(token: str, now_iso: str) -> dict | None:
    if use_supabase():
        sessions = _sb_request("GET", "sessions", f"token=eq.{urllib.parse.quote(token)}&select=*")
        if not sessions:
            return None
        session = sessions[0]
        expires = datetime.fromisoformat(str(session["expires_at"]).replace("Z", "+00:00"))
        if expires <= datetime.now(timezone.utc):
            _sb_request("DELETE", "sessions", f"token=eq.{urllib.parse.quote(token)}")
            return None
        users = _sb_request("GET", "users", f"id=eq.{session['user_id']}&select=*")
        return users[0] if users else None
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
            expires = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00"))
            if expires <= datetime.now(timezone.utc):
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
                conn.commit()
                return None
            return _as_dict(row)
        finally:
            conn.close()


def create_session(user_id: int, token: str, expires_at: str) -> None:
    if use_supabase():
        _sb_request(
            "POST",
            "sessions",
            body={"token": token, "user_id": user_id, "expires_at": expires_at},
            extra={"Prefer": "return=minimal"},
        )
        return
    with _db_lock:
        conn = connect()
        try:
            conn.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
                (token, user_id, expires_at),
            )
            conn.commit()
        finally:
            conn.close()


def delete_session(token: str) -> None:
    if use_supabase():
        _sb_request("DELETE", "sessions", f"token=eq.{urllib.parse.quote(token)}")
        return
    with _db_lock:
        conn = connect()
        try:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
        finally:
            conn.close()


def load_locker(user_id: int) -> tuple[dict[str, str], dict[str, dict]]:
    if use_supabase():
        pick_rows = _sb_request("GET", "picks", f"user_id=eq.{user_id}&select=pick_key,skin_name")
        label_rows = _sb_request("GET", "labels", f"user_id=eq.{user_id}&select=pick_key,color,slant,bold")
    else:
        with _db_lock:
            conn = connect()
            try:
                pick_rows = conn.execute(
                    "SELECT pick_key, skin_name FROM picks WHERE user_id = ?",
                    (user_id,),
                ).fetchall()
                label_rows = conn.execute(
                    "SELECT pick_key, color, slant, bold FROM labels WHERE user_id = ?",
                    (user_id,),
                ).fetchall()
            finally:
                conn.close()
    picks = {row["pick_key"]: row["skin_name"] for row in pick_rows}
    labels = {
        row["pick_key"]: {
            "color": row["color"] or "",
            "slant": bool(row["slant"]),
            "bold": bool(row["bold"]),
        }
        for row in label_rows
    }
    return picks, labels


def save_locker(user_id: int, cleaned: list[tuple[str, str]], label_items: list[tuple], now: str, replace_labels: bool) -> None:
    if use_supabase():
        _sb_request("DELETE", "picks", f"user_id=eq.{user_id}")
        if cleaned:
            _sb_request(
                "POST",
                "picks",
                body=[
                    {"user_id": user_id, "pick_key": pick_key, "skin_name": skin_name, "updated_at": now}
                    for pick_key, skin_name in cleaned
                ],
                extra={"Prefer": "return=minimal"},
            )
        if replace_labels:
            _sb_request("DELETE", "labels", f"user_id=eq.{user_id}")
            if label_items:
                _sb_request(
                    "POST",
                    "labels",
                    body=[
                        {
                            "user_id": user_id,
                            "pick_key": pick_key,
                            "color": color,
                            "slant": slant,
                            "bold": bold,
                        }
                        for pick_key, color, slant, bold in label_items
                    ],
                    extra={"Prefer": "return=minimal"},
                )
        return
    with _db_lock:
        conn = connect()
        try:
            conn.execute("DELETE FROM picks WHERE user_id = ?", (user_id,))
            conn.executemany(
                """
                INSERT INTO picks (user_id, pick_key, skin_name, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                [(user_id, pick_key, skin_name, now) for pick_key, skin_name in cleaned],
            )
            if replace_labels:
                conn.execute("DELETE FROM labels WHERE user_id = ?", (user_id,))
                conn.executemany(
                    """
                    INSERT INTO labels (user_id, pick_key, color, slant, bold)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    [(user_id, pick_key, color, slant, bold) for pick_key, color, slant, bold in label_items],
                )
            conn.commit()
        finally:
            conn.close()
