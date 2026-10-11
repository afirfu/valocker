"""Workshop commit vault: index in SQLite/Supabase, stills as files."""

from __future__ import annotations

import base64
import json
import os
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from store import (
    ROOT,
    _db_lock,
    _sb_request,
    _sb_root,
    connect,
    use_supabase,
)

STILLS_DIR = ROOT / "data" / "stills"
BUCKET = "workshop"
VALID_WEAPON = {
    "Classic",
    "Shorty",
    "Frenzy",
    "Ghost",
    "Bandit",
    "Sheriff",
    "Stinger",
    "Spectre",
    "Bucky",
    "Judge",
    "Melee",
    "Bulldog",
    "Guardian",
    "Warden",
    "Phantom",
    "Vandal",
    "Marshal",
    "Outlaw",
    "Operator",
    "Ares",
    "Odin",
}

_DATA_URL = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,(.+)$", re.I | re.S)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return secrets.token_urlsafe(16)


def ensure_workshop_sqlite() -> None:
    STILLS_DIR.mkdir(parents=True, exist_ok=True)
    with _db_lock:
        conn = connect()
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS workshop_commits (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    weapon TEXT NOT NULL,
                    parent_id TEXT,
                    name TEXT NOT NULL DEFAULT '',
                    notes TEXT NOT NULL DEFAULT '',
                    prompt TEXT NOT NULL DEFAULT '',
                    still_path TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS workshop_publishes (
                    user_id INTEGER NOT NULL,
                    weapon TEXT NOT NULL,
                    commit_id TEXT NOT NULL,
                    still_path TEXT NOT NULL DEFAULT '',
                    username TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, weapon, commit_id)
                );
                """
            )
            cols = {row[1] for row in conn.execute("PRAGMA table_info(workshop_publishes)").fetchall()}
            if cols and "username" not in cols:
                conn.execute("ALTER TABLE workshop_publishes ADD COLUMN username TEXT NOT NULL DEFAULT ''")
            conn.commit()
        finally:
            conn.close()


def decode_still(src: str) -> tuple[bytes, str]:
    raw = str(src or "").strip()
    match = _DATA_URL.match(raw)
    if match:
        return base64.b64decode(match.group(2)), match.group(1).lower()
    if raw.startswith("https://") or raw.startswith("http://"):
        req = urllib.request.Request(raw, method="GET")
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read()
            ctype = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip()
        if not body or len(body) > 4_000_000:
            raise ValueError("Still is empty")
        if ctype not in {"image/jpeg", "image/png", "image/webp"}:
            ctype = "image/jpeg"
        return body, ctype
    raise ValueError("Still is missing")


def _ext(ctype: str) -> str:
    if ctype == "image/png":
        return "png"
    if ctype == "image/webp":
        return "webp"
    return "jpg"


def _write_local_still(commit_id: str, payload: bytes, ctype: str) -> str:
    STILLS_DIR.mkdir(parents=True, exist_ok=True)
    path = STILLS_DIR / f"{commit_id}.{_ext(ctype)}"
    path.write_bytes(payload)
    return f"/api/workshop/still/{commit_id}"


def _upload_supabase_still(commit_id: str, payload: bytes, ctype: str) -> str | None:
    root = _sb_root()
    key = os.environ["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": ctype,
        "x-upsert": "true",
    }
    object_path = f"stills/{commit_id}.{_ext(ctype)}"
    req = urllib.request.Request(
        f"{root}/storage/v1/object/{BUCKET}/{object_path}",
        data=payload,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as error:
        if error.code in {400, 404}:
            _ensure_bucket(root, key)
            req = urllib.request.Request(
                f"{root}/storage/v1/object/{BUCKET}/{object_path}",
                data=payload,
                method="POST",
                headers=headers,
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp.read()
            except urllib.error.HTTPError:
                return None
        else:
            return None
    return f"{root}/storage/v1/object/public/{BUCKET}/{object_path}"


def _ensure_bucket(root: str, key: str) -> None:
    body = json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode("utf-8")
    req = urllib.request.Request(
        f"{root}/storage/v1/bucket",
        data=body,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
    except urllib.error.HTTPError:
        return


def store_still(commit_id: str, src: str) -> str:
    payload, ctype = decode_still(src)
    if use_supabase():
        remote = _upload_supabase_still(commit_id, payload, ctype)
        if remote:
            return remote
    return _write_local_still(commit_id, payload, ctype)


def read_local_still(commit_id: str) -> tuple[bytes, str] | None:
    if not re.fullmatch(r"[\w-]+", commit_id):
        return None
    for ext, ctype in (("jpg", "image/jpeg"), ("png", "image/png"), ("webp", "image/webp")):
        path = STILLS_DIR / f"{commit_id}.{ext}"
        if path.is_file():
            return path.read_bytes(), ctype
    return None


def _row(commit: dict) -> dict[str, Any]:
    return {
        "id": str(commit.get("id") or ""),
        "weapon": str(commit.get("weapon") or ""),
        "parent_id": str(commit.get("parent_id") or "") or None,
        "name": str(commit.get("name") or ""),
        "notes": str(commit.get("notes") or ""),
        "prompt": str(commit.get("prompt") or ""),
        "src": str(commit.get("still_path") or ""),
        "created_at": str(commit.get("created_at") or ""),
    }


def save_commit(
    user_id: int,
    weapon: str,
    name: str,
    notes: str,
    prompt: str,
    still_src: str,
    parent_id: str | None,
) -> dict[str, Any]:
    if weapon not in VALID_WEAPON:
        raise ValueError("Unknown weapon")
    commit_id = _new_id()
    parent = (parent_id or "").strip() or None
    if parent:
        existing = get_commit(user_id, parent)
        if not existing or existing["weapon"] != weapon:
            parent = None
    path = store_still(commit_id, still_src)
    record = {
        "id": commit_id,
        "user_id": user_id,
        "weapon": weapon,
        "parent_id": parent,
        "name": str(name or "")[:32],
        "notes": str(notes or "")[:2000],
        "prompt": str(prompt or "")[:1500],
        "still_path": path,
        "created_at": _now(),
    }
    if use_supabase():
        try:
            _sb_request("POST", "workshop_commits", body=record, extra={"Prefer": "return=minimal"})
            return _row(record)
        except ValueError:
            pass
    ensure_workshop_sqlite()
    with _db_lock:
        conn = connect()
        try:
            conn.execute(
                """
                INSERT INTO workshop_commits
                (id, user_id, weapon, parent_id, name, notes, prompt, still_path, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    user_id,
                    weapon,
                    parent,
                    record["name"],
                    record["notes"],
                    record["prompt"],
                    path,
                    record["created_at"],
                ),
            )
            conn.commit()
        finally:
            conn.close()
    return _row(record)


def list_commits(user_id: int, weapon: str, bundle: str = "") -> list[dict[str, Any]]:
    if weapon not in VALID_WEAPON:
        return []
    bundle = str(bundle or "").strip()
    rows: list[dict] = []
    if use_supabase():
        try:
            query = f"user_id=eq.{user_id}&weapon=eq.{urllib.parse.quote(weapon)}&select=*&order=created_at.asc"
            if bundle:
                query = f"user_id=eq.{user_id}&weapon=eq.{urllib.parse.quote(weapon)}&name=eq.{urllib.parse.quote(bundle)}&select=*&order=created_at.asc"
            rows = _sb_request("GET", "workshop_commits", query)
        except ValueError:
            rows = []
    if not rows:
        ensure_workshop_sqlite()
        with _db_lock:
            conn = connect()
            try:
                if bundle:
                    found = conn.execute(
                        """
                        SELECT * FROM workshop_commits
                        WHERE user_id = ? AND weapon = ? AND name = ?
                        ORDER BY created_at ASC
                        """,
                        (user_id, weapon, bundle),
                    ).fetchall()
                else:
                    found = conn.execute(
                        """
                        SELECT * FROM workshop_commits
                        WHERE user_id = ? AND weapon = ?
                        ORDER BY created_at ASC
                        """,
                        (user_id, weapon),
                    ).fetchall()
                rows = [dict(row) for row in found]
            finally:
                conn.close()
    return [_row(row) for row in rows]


def list_bundles(user_id: int) -> list[str]:
    names: list[str] = []
    if use_supabase():
        try:
            rows = _sb_request(
                "GET",
                "workshop_commits",
                f"user_id=eq.{user_id}&select=name,created_at&order=created_at.asc",
            )
            names = [str(row.get("name") or "").strip() for row in rows]
        except ValueError:
            names = []
    if not names:
        ensure_workshop_sqlite()
        with _db_lock:
            conn = connect()
            try:
                found = conn.execute(
                    """
                    SELECT name FROM workshop_commits
                    WHERE user_id = ? AND name != ''
                    ORDER BY created_at ASC
                    """,
                    (user_id,),
                ).fetchall()
                names = [str(row["name"] or "").strip() for row in found]
            finally:
                conn.close()
    seen: list[str] = []
    for name in names:
        if name and name not in seen:
            seen.append(name)
    return seen


def latest_bundle_still(user_id: int, bundle: str, exclude_weapon: str = "") -> str:
    bundle = str(bundle or "").strip()
    if not bundle:
        return ""
    rows: list[dict] = []
    if use_supabase():
        try:
            rows = _sb_request(
                "GET",
                "workshop_commits",
                f"user_id=eq.{user_id}&name=eq.{urllib.parse.quote(bundle)}&select=weapon,still_path,created_at&order=created_at.desc",
            )
        except ValueError:
            rows = []
    if not rows:
        ensure_workshop_sqlite()
        with _db_lock:
            conn = connect()
            try:
                found = conn.execute(
                    """
                    SELECT weapon, still_path FROM workshop_commits
                    WHERE user_id = ? AND name = ?
                    ORDER BY created_at DESC
                    """,
                    (user_id, bundle),
                ).fetchall()
                rows = [dict(row) for row in found]
            finally:
                conn.close()
    skip = str(exclude_weapon or "").strip()
    for row in rows:
        if skip and str(row.get("weapon") or "") == skip:
            continue
        src = str(row.get("still_path") or "").strip()
        if src:
            return src
    return ""


def get_commit(user_id: int, commit_id: str) -> dict[str, Any] | None:
    commit_id = str(commit_id or "").strip()
    if not commit_id:
        return None
    if use_supabase():
        try:
            rows = _sb_request(
                "GET",
                "workshop_commits",
                f"id=eq.{urllib.parse.quote(commit_id)}&user_id=eq.{user_id}&select=*",
            )
            if rows:
                return _row(rows[0])
        except ValueError:
            pass
    ensure_workshop_sqlite()
    with _db_lock:
        conn = connect()
        try:
            row = conn.execute(
                "SELECT * FROM workshop_commits WHERE id = ? AND user_id = ?",
                (commit_id, user_id),
            ).fetchone()
            return _row(dict(row)) if row else None
        finally:
            conn.close()


def publish_commit(user_id: int, weapon: str, commit_id: str, username: str = "") -> dict[str, Any]:
    commit = get_commit(user_id, commit_id)
    if not commit or commit["weapon"] != weapon:
        raise ValueError("Version is not ready")
    if not commit["src"]:
        raise ValueError("Generate a still first")
    record = {
        "user_id": user_id,
        "weapon": weapon,
        "commit_id": commit["id"],
        "still_path": commit["src"],
        "username": str(username or "")[:32],
        "created_at": _now(),
    }
    if use_supabase():
        try:
            _sb_request("POST", "workshop_publishes", body=record, extra={"Prefer": "return=minimal,resolution=ignore-duplicates"})
            return {"ok": True, "weapon": weapon, "id": commit["id"], "src": commit["src"]}
        except ValueError:
            pass
    ensure_workshop_sqlite()
    with _db_lock:
        conn = connect()
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO workshop_publishes
                (user_id, weapon, commit_id, still_path, username, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, weapon, commit["id"], commit["src"], record["username"], record["created_at"]),
            )
            conn.commit()
        finally:
            conn.close()
    return {"ok": True, "weapon": weapon, "id": commit["id"], "src": commit["src"]}


def list_publishes() -> dict[str, list[dict[str, str]]]:
    rows: list[dict] = []
    if use_supabase():
        try:
            rows = _sb_request("GET", "workshop_publishes", "select=weapon,commit_id,still_path,username&order=created_at.asc")
        except ValueError:
            rows = []
    if not rows:
        ensure_workshop_sqlite()
        with _db_lock:
            conn = connect()
            try:
                found = conn.execute(
                    "SELECT weapon, commit_id, still_path, username FROM workshop_publishes ORDER BY created_at ASC"
                ).fetchall()
                rows = [dict(row) for row in found]
            finally:
                conn.close()
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        weapon = str(row.get("weapon") or "")
        src = str(row.get("still_path") or "")
        commit_id = str(row.get("commit_id") or "")
        if weapon not in VALID_WEAPON or not src:
            continue
        grouped.setdefault(weapon, []).append({
            "id": commit_id,
            "src": src,
            "username": str(row.get("username") or ""),
        })
    return grouped
