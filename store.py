"""SQLite locally, Supabase when SUPABASE_URL + SUPABASE_SECRET_KEY are set."""

from __future__ import annotations

import binascii
import base64
import hashlib
import hmac
import json
import os
import secrets as _secrets
import sqlite3
import threading
import time
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


def update_password(user_id: int, password_salt: str, password_hash: str) -> None:
    if use_supabase():
        _sb_request(
            "PATCH",
            "users",
            f"id=eq.{user_id}",
            body={"password_salt": password_salt, "password_hash": password_hash},
            extra={"Prefer": "return=minimal"},
        )
        return
    with _db_lock:
        conn = connect()
        try:
            conn.execute(
                "UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?",
                (password_salt, password_hash, user_id),
            )
            conn.commit()
        finally:
            conn.close()


def _recover_secret() -> bytes:
    return (os.environ.get("SUPABASE_SECRET_KEY") or "valocker-local-recover").encode()


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    pad = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + pad)


def hash_recover_answer(key: str, answer: str) -> str:
    return hmac.new(_recover_secret(), f"{key}\0{answer}".encode(), hashlib.sha256).hexdigest()


def sign_recover(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    sig = hmac.new(_recover_secret(), raw, hashlib.sha256).hexdigest()
    return f"{_b64(raw)}.{sig}"


def read_recover(token: str) -> dict | None:
    try:
        blob, sig = str(token or "").split(".", 1)
        raw = _unb64(blob)
        expect = hmac.new(_recover_secret(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expect, sig):
            return None
        data = json.loads(raw.decode())
        if int(data.get("e") or 0) < time.time():
            return None
        return data
    except (ValueError, json.JSONDecodeError, TypeError, binascii.Error):
        return None


def start_recover(username: str, slots: list) -> dict:
    user = find_user(username)
    if not user:
        raise ValueError("Can't reset that account")
    picks, _labels = load_locker(int(user["id"]))
    viable: list[str] = []
    seen: set[str] = set()
    for raw in slots:
        key = str(raw or "").strip()
        if not key or ":" not in key or key in seen:
            continue
        seen.add(key)
        viable.append(key)
    if len(viable) < 3:
        raise ValueError("Locker is not ready")
    filled = [key for key in viable if picks.get(key)]
    empty = [key for key in viable if not picks.get(key)]
    rng = _secrets.SystemRandom()
    rng.shuffle(filled)
    rng.shuffle(empty)
    chosen = filled[:3]
    if len(chosen) < 3:
        chosen.extend(empty[: 3 - len(chosen)])
    if len(chosen) < 3:
        raise ValueError("Locker is not ready")
    rng.shuffle(chosen)
    payload = {
        "u": int(user["id"]),
        "n": str(user["username"]),
        "k": chosen,
        "h": [hash_recover_answer(key, str(picks.get(key) or "")) for key in chosen],
        "p": 0,
        "e": int(time.time()) + 15 * 60,
    }
    return {"token": sign_recover(payload), "keys": list(chosen)}


def check_recover(token: str, guesses: dict) -> dict:
    data = read_recover(token)
    if not data:
        raise ValueError("Reset is not ready")
    keys = data.get("k") or []
    hashes = data.get("h") or []
    if len(keys) != 3 or len(hashes) != 3:
        raise ValueError("Reset is not ready")
    ok = True
    for key, expect in zip(keys, hashes):
        guess = str((guesses or {}).get(key) or "").strip()
        if not hmac.compare_digest(hash_recover_answer(str(key), guess), str(expect)):
            ok = False
    data["p"] = 1 if ok else 0
    data["e"] = int(time.time()) + 15 * 60
    return {"ok": ok, "token": sign_recover(data)}


def recover_reset_user(token: str) -> dict | None:
    data = read_recover(token)
    if not data or not data.get("p"):
        return None
    return data


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
        try:
            label_rows = _sb_request("GET", "labels", f"user_id=eq.{user_id}&select=pick_key,color,slant,bold,underline")
        except ValueError:
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
                    "SELECT pick_key, color, slant, bold, underline FROM labels WHERE user_id = ?",
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
            "underline": bool(_as_dict(row).get("underline")),
        }
        for row in label_rows
    }
    return picks, labels


def empty_overwrite_blocked(user_id: int, cleaned: list[tuple[str, str]]) -> bool:
    if cleaned:
        return False
    existing, _labels = load_locker(user_id)
    return bool(existing)


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
                rows = [
                    {
                        "user_id": user_id,
                        "pick_key": pick_key,
                        "color": color,
                        "slant": slant,
                        "bold": bold,
                        "underline": underline,
                    }
                    for pick_key, color, slant, bold, underline in label_items
                ]
                try:
                    _sb_request("POST", "labels", body=rows, extra={"Prefer": "return=minimal"})
                except ValueError:
                    for row in rows:
                        row.pop("underline", None)
                    _sb_request("POST", "labels", body=rows, extra={"Prefer": "return=minimal"})
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
                    INSERT INTO labels (user_id, pick_key, color, slant, bold, underline)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    [(user_id, pick_key, color, slant, bold, underline) for pick_key, color, slant, bold, underline in label_items],
                )
            conn.commit()
        finally:
            conn.close()


def sanitize_layout(raw: Any) -> dict | None:
    if not isinstance(raw, dict):
        return None
    categories: list[str] = []
    cats_in = raw.get("categories")
    if isinstance(cats_in, list):
        for item in cats_in[:20]:
            value = str(item or "").strip()
            if value and value not in categories:
                categories.append(value)
    weapons: dict[str, list[str]] = {}
    weapons_in = raw.get("weapons")
    if isinstance(weapons_in, dict):
        for key, value in list(weapons_in.items())[:20]:
            category = str(key or "").strip()
            if not category or not isinstance(value, list):
                continue
            uuids: list[str] = []
            for item in value[:40]:
                uid = str(item or "").strip()
                if uid and uid not in uuids:
                    uuids.append(uid)
            weapons[category] = uuids
    if not categories and not weapons:
        return None
    return {"categories": categories, "weapons": weapons}


def load_layout(user_id: int) -> dict | None:
    if use_supabase():
        try:
            rows = _sb_request("GET", "layouts", f"user_id=eq.{user_id}&select=payload")
        except ValueError:
            return None
        if not rows:
            return None
        return sanitize_layout(rows[0].get("payload"))
    with _db_lock:
        conn = connect()
        try:
            try:
                row = conn.execute(
                    "SELECT payload FROM layouts WHERE user_id = ?",
                    (user_id,),
                ).fetchone()
            except sqlite3.OperationalError:
                return None
            if not row:
                return None
            try:
                return sanitize_layout(json.loads(row["payload"]))
            except (TypeError, json.JSONDecodeError):
                return None
        finally:
            conn.close()


def save_layout(user_id: int, payload: dict | None) -> None:
    cleaned = sanitize_layout(payload)
    if use_supabase():
        try:
            _sb_request("DELETE", "layouts", f"user_id=eq.{user_id}")
            if cleaned:
                _sb_request(
                    "POST",
                    "layouts",
                    body={"user_id": user_id, "payload": cleaned},
                    extra={"Prefer": "return=minimal"},
                )
        except ValueError:
            return
        return
    with _db_lock:
        conn = connect()
        try:
            try:
                conn.execute("DELETE FROM layouts WHERE user_id = ?", (user_id,))
                if cleaned:
                    conn.execute(
                        "INSERT INTO layouts (user_id, payload) VALUES (?, ?)",
                        (user_id, json.dumps(cleaned)),
                    )
                conn.commit()
            except sqlite3.OperationalError:
                return
        finally:
            conn.close()


def _xh_bool(value: Any, fallback: bool) -> bool:
    if value is None:
        return fallback
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip() in {"1", "true", "True"}


def _xh_num(value: Any, fallback: float, low: float, high: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return min(high, max(low, number))


def _xh_int(value: Any, fallback: int, low: int, high: int) -> int:
    return int(_xh_num(value, fallback, low, high))


def sanitize_crosshair_spec(raw: Any) -> dict:
    data = raw if isinstance(raw, dict) else {}
    inner_in = data.get("inner") if isinstance(data.get("inner"), dict) else {}
    outer_in = data.get("outer") if isinstance(data.get("outer"), dict) else {}
    extra_in = data.get("extra") if isinstance(data.get("extra"), dict) else {}
    extra = {}
    for key, value in list(extra_in.items())[:16]:
        extra[str(key)[:8]] = str(value)[:24]
    hex_raw = str(data.get("customHex") or "FFFFFF").replace("#", "").strip().upper()
    if len(hex_raw) != 6 or any(ch not in "0123456789ABCDEF" for ch in hex_raw):
        hex_raw = "FFFFFF"
    return {
        "color": _xh_int(data.get("color"), 0, 0, 8),
        "customHex": hex_raw,
        "outlines": _xh_bool(data.get("outlines"), True),
        "outlineOpacity": _xh_num(data.get("outlineOpacity"), 0.5, 0, 1),
        "outlineThickness": _xh_int(data.get("outlineThickness"), 1, 1, 6),
        "centerDot": _xh_bool(data.get("centerDot"), False),
        "centerDotOpacity": _xh_num(data.get("centerDotOpacity"), 1, 0, 1),
        "centerDotThickness": _xh_int(data.get("centerDotThickness"), 2, 1, 6),
        "inner": {
            "show": _xh_bool(inner_in.get("show"), True),
            "opacity": _xh_num(inner_in.get("opacity"), 0.8, 0, 1),
            "length": _xh_int(inner_in.get("length"), 6, 0, 20),
            "lengthV": _xh_int(inner_in.get("lengthV"), 6, 0, 20),
            "linked": _xh_bool(inner_in.get("linked"), True),
            "thickness": _xh_int(inner_in.get("thickness"), 2, 0, 10),
            "offset": _xh_int(inner_in.get("offset"), 3, 0, 20),
        },
        "outer": {
            "show": _xh_bool(outer_in.get("show"), True),
            "opacity": _xh_num(outer_in.get("opacity"), 0.35, 0, 1),
            "length": _xh_int(outer_in.get("length"), 2, 0, 20),
            "lengthV": _xh_int(outer_in.get("lengthV"), 2, 0, 20),
            "linked": _xh_bool(outer_in.get("linked"), True),
            "thickness": _xh_int(outer_in.get("thickness"), 2, 0, 10),
            "offset": _xh_int(outer_in.get("offset"), 10, 0, 40),
        },
        "extra": extra,
    }


def sanitize_crosshair(raw: Any) -> dict:
    data = raw if isinstance(raw, dict) else {}
    profiles_in = data.get("profiles")
    profiles: list[dict] = []
    if isinstance(profiles_in, list) and profiles_in:
        for index, item in enumerate(profiles_in[:8]):
            spec = sanitize_crosshair_spec(item)
            name = str((item or {}).get("name") if isinstance(item, dict) else "").strip()[:24]
            spec["name"] = name or f"Profile {index + 1}"
            profiles.append(spec)
    else:
        spec = sanitize_crosshair_spec(data)
        spec["name"] = "Profile 1"
        extra = sanitize_crosshair_spec({})
        extra["name"] = "Profile 2"
        profiles = [spec, extra]
    if len(profiles) < 2:
        spare = sanitize_crosshair_spec({})
        spare["name"] = "Profile 2"
        profiles.append(spare)
    active = _xh_int(data.get("active"), 0, 0, len(profiles) - 1)
    mode = "default" if data.get("mode") == "default" else "custom"
    return {"mode": mode, "active": active, "profiles": profiles}


def load_crosshair(user_id: int) -> dict | None:
    if use_supabase():
        try:
            rows = _sb_request("GET", "crosshairs", f"user_id=eq.{user_id}&select=payload")
        except ValueError:
            return None
        if not rows:
            return None
        return sanitize_crosshair(rows[0].get("payload"))
    with _db_lock:
        conn = connect()
        try:
            try:
                row = conn.execute(
                    "SELECT payload FROM crosshairs WHERE user_id = ?",
                    (user_id,),
                ).fetchone()
            except sqlite3.OperationalError:
                return None
            if not row:
                return None
            try:
                return sanitize_crosshair(json.loads(row["payload"]))
            except (TypeError, json.JSONDecodeError):
                return None
        finally:
            conn.close()


def sanitize_agent(raw: Any) -> str:
    value = str(raw or "").strip()
    if not value or len(value) > 64:
        return ""
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-")
    if any(ch not in allowed for ch in value):
        return ""
    return value


def load_agent(user_id: int) -> str:
    if use_supabase():
        try:
            rows = _sb_request("GET", "avatars", f"user_id=eq.{user_id}&select=agent")
        except ValueError:
            return ""
        if not rows:
            return ""
        return sanitize_agent(rows[0].get("agent"))
    with _db_lock:
        conn = connect()
        try:
            try:
                row = conn.execute(
                    "SELECT agent FROM avatars WHERE user_id = ?",
                    (user_id,),
                ).fetchone()
            except sqlite3.OperationalError:
                return ""
            return sanitize_agent(row["agent"] if row else "")
        finally:
            conn.close()


def save_agent(user_id: int, raw: Any) -> None:
    cleaned = sanitize_agent(raw)
    if use_supabase():
        try:
            _sb_request("DELETE", "avatars", f"user_id=eq.{user_id}")
            if cleaned:
                _sb_request(
                    "POST",
                    "avatars",
                    body={"user_id": user_id, "agent": cleaned},
                    extra={"Prefer": "return=minimal"},
                )
        except ValueError:
            return
        return
    with _db_lock:
        conn = connect()
        try:
            try:
                if not cleaned:
                    conn.execute("DELETE FROM avatars WHERE user_id = ?", (user_id,))
                else:
                    conn.execute(
                        "INSERT INTO avatars (user_id, agent) VALUES (?, ?) "
                        "ON CONFLICT(user_id) DO UPDATE SET agent = excluded.agent",
                        (user_id, cleaned),
                    )
                conn.commit()
            except sqlite3.OperationalError:
                return
        finally:
            conn.close()


def save_crosshair(user_id: int, payload: dict | None) -> None:
    cleaned = sanitize_crosshair(payload)
    if use_supabase():
        try:
            _sb_request("DELETE", "crosshairs", f"user_id=eq.{user_id}")
            _sb_request(
                "POST",
                "crosshairs",
                body={"user_id": user_id, "payload": cleaned},
                extra={"Prefer": "return=minimal"},
            )
        except ValueError:
            return
        return
    with _db_lock:
        conn = connect()
        try:
            try:
                conn.execute(
                    "INSERT INTO crosshairs (user_id, payload) VALUES (?, ?) "
                    "ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload",
                    (user_id, json.dumps(cleaned)),
                )
                conn.commit()
            except sqlite3.OperationalError:
                return
        finally:
            conn.close()
