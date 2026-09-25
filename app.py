"""Vercel entrypoint: Flask app that serves VaLocker pages and the same API."""

from __future__ import annotations

import os
import secrets
from http import HTTPStatus
from io import BytesIO

from flask import Flask, Response, jsonify, request, send_from_directory

from export_docx import build_locker_docx, sanitize_groups
from server import (
    COOKIE_NAME,
    ROOT,
    SESSION_DAYS,
    create_session_token,
    current_user_from_cookie,
    hash_password,
    init_db,
    iso,
    normalize_username,
    utc_now,
    user_public,
)
from store import create_user, delete_session, find_user, load_locker, save_locker, user_exists

app = Flask(__name__)
init_db()


def cookie_secure() -> bool:
    return bool(os.environ.get("VERCEL"))


def set_session_cookie(response: Response, token: str | None, *, clear: bool = False) -> Response:
    if clear or not token:
        response.set_cookie(
            COOKIE_NAME,
            "",
            max_age=0,
            httponly=True,
            samesite="Lax",
            secure=cookie_secure(),
            path="/",
        )
        return response
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="Lax",
        secure=cookie_secure(),
        path="/",
    )
    return response


def current_user():
    return current_user_from_cookie(request.headers.get("Cookie"))


PUBLIC = ROOT / "public"


@app.get("/")
@app.get("/index.html")
def home():
    return send_from_directory(PUBLIC, "index.html")


@app.get("/app.js")
def app_js():
    return send_from_directory(PUBLIC, "app.js")


@app.get("/api/session")
def api_session():
    user = current_user()
    return jsonify({"user": user_public(user) if user else None})


@app.get("/api/identity")
def api_identity():
    username = normalize_username(request.args.get("username") or "")
    if not username:
        return jsonify({"exists": False})
    return jsonify({"exists": user_exists(username)})


@app.get("/api/picks")
def api_get_picks():
    user = current_user()
    if not user:
        return jsonify({"error": "Not logged in"}), HTTPStatus.UNAUTHORIZED
    picks, labels = load_locker(user["id"])
    return jsonify({"picks": picks, "labels": labels})


@app.post("/api/register")
def api_register():
    body = request.get_json(silent=True) or {}
    username = normalize_username(str(body.get("username") or ""))
    password = str(body.get("password") or "")
    if not username:
        return jsonify({"error": "Username is required"}), HTTPStatus.BAD_REQUEST
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), HTTPStatus.BAD_REQUEST
    salt, digest = hash_password(password)
    if user_exists(username):
        return jsonify({"error": "That username already exists"}), HTTPStatus.CONFLICT
    user_id = create_user(username, salt, digest, iso(utc_now()))
    token = create_session_token(user_id)
    response = jsonify({"user": {"username": username}})
    return set_session_cookie(response, token)


@app.post("/api/login")
def api_login():
    body = request.get_json(silent=True) or {}
    username = normalize_username(str(body.get("username") or ""))
    password = str(body.get("password") or "")
    user = find_user(username)
    if not user:
        return jsonify({"error": "Username or password is wrong"}), HTTPStatus.UNAUTHORIZED
    _, digest = hash_password(password, user["password_salt"])
    if not secrets.compare_digest(digest, user["password_hash"]):
        return jsonify({"error": "Username or password is wrong"}), HTTPStatus.UNAUTHORIZED
    token = create_session_token(user["id"])
    response = jsonify({"user": user_public(user)})
    return set_session_cookie(response, token)


@app.post("/api/logout")
def api_logout():
    from http.cookies import SimpleCookie

    cookie = SimpleCookie()
    raw = request.headers.get("Cookie")
    if raw:
        cookie.load(raw)
        morsel = cookie.get(COOKIE_NAME)
        if morsel:
            delete_session(morsel.value)
    response = jsonify({"ok": True})
    return set_session_cookie(response, None, clear=True)


@app.post("/api/picks")
def api_save_picks():
    user = current_user()
    if not user:
        return jsonify({"error": "Not logged in"}), HTTPStatus.UNAUTHORIZED
    body = request.get_json(silent=True) or {}
    picks = body.get("picks")
    if not isinstance(picks, dict):
        return jsonify({"error": "Picks are required"}), HTTPStatus.BAD_REQUEST
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
    save_locker(user["id"], cleaned, label_items, iso(utc_now()), isinstance(raw_labels, dict))
    return jsonify({"ok": True})


@app.post("/api/export")
def api_export():
    user = current_user()
    if not user:
        return jsonify({"error": "Not logged in"}), HTTPStatus.UNAUTHORIZED
    body = request.get_json(silent=True) or {}
    try:
        groups = sanitize_groups(body.get("groups"))
    except ValueError as error:
        return jsonify({"error": str(error)}), HTTPStatus.BAD_REQUEST
    username = str(user["username"])
    payload = build_locker_docx(username, groups)
    safe = "".join(ch for ch in username if ch.isalnum() or ch in "-_") or "valocker"
    return Response(
        BytesIO(payload).getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{safe}-valocker.docx"'},
    )
