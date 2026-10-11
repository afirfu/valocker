"""Owner-only workshop stills: Gemini compiles notes, Fal Flux paints."""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

from store import generate_usage, refund_generate, reserve_generate
from workshop_vault import read_local_still

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
FAL_QUEUE = "https://queue.fal.run/{model}"
DEFAULT_GEMINI = "gemini-3.5-flash"
DEFAULT_FAL = "fal-ai/flux/dev"
DEFAULT_CAP = 8
STILL_W = 1280
STILL_H = 720
MAX_REFS = 4
MAX_REF_CHARS = 400_000

PART_KITS = {
    "sidearm": [("slide", "Slide"), ("frame", "Frame"), ("mag", "Mag")],
    "smg": [("muzzle", "Muzzle"), ("barrel", "Barrel"), ("receiver", "Receiver"), ("mag", "Mag"), ("stock", "Stock")],
    "shotgun": [("barrel", "Barrel"), ("receiver", "Receiver"), ("forend", "Forend"), ("stock", "Stock")],
    "rifle": [("muzzle", "Muzzle"), ("barrel", "Barrel"), ("receiver", "Receiver"), ("mag", "Mag"), ("stock", "Stock"), ("grip", "Grip")],
    "sniper": [("muzzle", "Muzzle"), ("barrel", "Barrel"), ("receiver", "Receiver"), ("mag", "Mag"), ("stock", "Stock")],
    "lmg": [("barrel", "Barrel"), ("receiver", "Receiver"), ("mag", "Mag"), ("stock", "Stock"), ("bipod", "Bipod")],
    "melee": [("blade", "Blade"), ("handle", "Handle")],
}

WEAPON_CLASS = {
    "Classic": "sidearm",
    "Shorty": "sidearm",
    "Frenzy": "sidearm",
    "Ghost": "sidearm",
    "Bandit": "sidearm",
    "Sheriff": "sidearm",
    "Stinger": "smg",
    "Spectre": "smg",
    "Bucky": "shotgun",
    "Judge": "shotgun",
    "Melee": "melee",
    "Bulldog": "rifle",
    "Guardian": "rifle",
    "Warden": "rifle",
    "Phantom": "rifle",
    "Vandal": "rifle",
    "Marshal": "sniper",
    "Outlaw": "sniper",
    "Operator": "sniper",
    "Ares": "lmg",
    "Odin": "lmg",
}

COMPOSE_SYSTEM = """You compile one image prompt for a fictional competitive-FPS weapon cosmetic, like a Valorant skin still.
Use ONLY the user's notes and attached reference photos. Do not invent colors, ornaments, lore, materials, or parts they did not write or show.
If a field is empty, skip it. If a photo is attached, describe only what is visible.
Hard constraints you must include in the prompt:
- true side profile, muzzle pointing LEFT (barrel on the left, stock on the right)
- isolated gun only, flat solid light-grey studio backdrop, no floor shadow spill
- keep the named class parts; no extra attachments
- no character, no blood, no real firearm brand
No markdown. No preface. Prompt only."""


class GenerateError(Exception):
    def __init__(self, message: str, status: int = 400, refund: bool = False):
        super().__init__(message)
        self.status = status
        self.refund = refund


def daily_cap() -> int:
    try:
        return max(1, int(os.environ.get("GENERATE_DAILY_CAP") or DEFAULT_CAP))
    except ValueError:
        return DEFAULT_CAP


def keys_ready() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY", "").strip() and os.environ.get("FAL_KEY", "").strip())


def generate_status(user_id: int) -> dict[str, Any]:
    cap = daily_cap()
    used = generate_usage(user_id)
    return {
        "ready": keys_ready(),
        "used": used,
        "cap": cap,
        "remaining": max(0, cap - used),
    }


def require_keys() -> None:
    if not keys_ready():
        raise GenerateError("Add GEMINI_API_KEY and FAL_KEY to .env", 503)


def _clip(value: Any, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _http_json(method: str, url: str, headers: dict[str, str], body: Any = None, timeout: int = 30) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise GenerateError(_public_error(detail, error.code), 502) from error
    except urllib.error.URLError as error:
        raise GenerateError("Generate service is unreachable", 502) from error


def _public_error(detail: str, code: int) -> str:
    try:
        payload = json.loads(detail)
    except json.JSONDecodeError:
        payload = {}
    if isinstance(payload, dict):
        err = payload.get("error")
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])[:180]
        if isinstance(err, str) and err.strip():
            return err.strip()[:180]
        if payload.get("message"):
            return str(payload["message"])[:180]
        if payload.get("detail"):
            return str(payload["detail"])[:180]
    return f"Generate failed ({code})"


def sanitize_blueprint(body: dict) -> dict:
    weapon = _clip(body.get("weapon"), 32)
    klass = WEAPON_CLASS.get(weapon)
    if not klass:
        raise GenerateError("Unknown weapon")
    kit = PART_KITS[klass]
    raw_parts = body.get("parts")
    if not isinstance(raw_parts, dict):
        raw_parts = {}
    concept = body.get("concept")
    if not isinstance(concept, dict):
        concept = {}
    parts = []
    for part_id, label in kit:
        slot = raw_parts.get(part_id)
        if not isinstance(slot, dict):
            slot = {}
        parts.append({
            "id": part_id,
            "label": label,
            "text": _clip(slot.get("text"), 800),
            "refs": _sanitize_refs(slot.get("refs")),
        })
    return {
        "weapon": weapon,
        "klass": klass,
        "name": _clip(body.get("name"), 32) or "Draft1",
        "concept": {
            "text": _clip(concept.get("text"), 2000),
            "refs": _sanitize_refs(concept.get("refs")),
        },
        "parts": parts,
    }


def _sanitize_refs(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    cleaned = []
    for item in raw:
        if len(cleaned) >= MAX_REFS:
            break
        if not isinstance(item, dict):
            continue
        mime = str(item.get("mime") or "").strip().lower()
        data = "".join(str(item.get("data") or "").split())
        if mime not in {"image/jpeg", "image/png", "image/webp"}:
            continue
        if not data or len(data) > MAX_REF_CHARS:
            continue
        cleaned.append({"mime": mime, "data": data})
    return cleaned


def blueprint_has_notes(blueprint: dict) -> bool:
    if blueprint["concept"]["text"] or blueprint["concept"]["refs"]:
        return True
    return any(part["text"] or part["refs"] for part in blueprint["parts"])


def blueprint_text(blueprint: dict) -> str:
    lines = [
        f"Weapon: {blueprint['weapon']}",
        f"Class: {blueprint['klass']}",
        f"Name: {blueprint['name']}",
        f"Overall notes: {blueprint['concept']['text'] or '(empty)'}",
        f"Overall refs: {len(blueprint['concept']['refs'])}",
    ]
    for part in blueprint["parts"]:
        lines.append(f"{part['label']} notes: {part['text'] or '(empty)'}")
        lines.append(f"{part['label']} refs: {len(part['refs'])}")
    return "\n".join(lines)


def collect_refs(blueprint: dict) -> list[dict[str, str]]:
    refs = list(blueprint["concept"]["refs"])
    for part in blueprint["parts"]:
        for ref in part["refs"]:
            if len(refs) >= MAX_REFS:
                return refs
            refs.append(ref)
    return refs[:MAX_REFS]


def compose_prompt(blueprint: dict) -> str:
    model = (os.environ.get("GEMINI_MODEL") or DEFAULT_GEMINI).strip()
    key = os.environ["GEMINI_API_KEY"].strip()
    parts: list[dict[str, Any]] = [{"text": blueprint_text(blueprint)}]
    for ref in collect_refs(blueprint):
        parts.append({"inline_data": {"mime_type": ref["mime"], "data": ref["data"]}})
    payload = _http_json(
        "POST",
        GEMINI_URL.format(model=model),
        {"Content-Type": "application/json", "x-goog-api-key": key},
        {
            "systemInstruction": {"parts": [{"text": COMPOSE_SYSTEM}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 512,
                "thinkingConfig": {"thinkingBudget": 0},
            },
        },
        timeout=25,
    )
    text = _gemini_text(payload)
    if not text:
        raise GenerateError("Composer returned an empty prompt", 502)
    return text


def _gemini_text(payload: dict) -> str:
    for candidate in payload.get("candidates") or []:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = str(part.get("text") or "").strip()
            if text:
                return text[:1500]
    return ""


def _fal_headers() -> dict[str, str]:
    return {
        "Authorization": f"Key {os.environ['FAL_KEY'].strip()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _fal_image_url(payload: dict) -> str:
    images = payload.get("images")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, dict) and first.get("url"):
            return str(first["url"]).strip()
        if isinstance(first, str) and first.strip():
            return first.strip()
    image = payload.get("image")
    if isinstance(image, dict) and image.get("url"):
        return str(image["url"]).strip()
    if isinstance(image, str) and image.strip():
        return image.strip()
    return ""


def resolve_base_src(src: str) -> str:
    raw = str(src or "").strip()
    if raw.startswith("data:image/"):
        return raw
    if "/api/workshop/still/" in raw:
        commit_id = raw.rstrip("/").rsplit("/", 1)[-1]
        found = read_local_still(commit_id)
        if found:
            payload, ctype = found
            return f"data:{ctype};base64,{base64.b64encode(payload).decode('ascii')}"
    if raw.startswith("https://") or raw.startswith("http://"):
        return raw
    return ""


def submit_fal(model: str, body: dict) -> dict:
    payload = _http_json("POST", FAL_QUEUE.format(model=model), _fal_headers(), body, timeout=25)
    ready = _fal_image_url(payload)
    if ready:
        return {"done": ready, "model": model}
    request_id = str(payload.get("request_id") or "").strip()
    if not request_id:
        raise GenerateError("Painter did not start", 502, refund=True)
    payload["model"] = model
    return payload


def submit_flux(prompt: str, base_src: str = "") -> dict:
    source = resolve_base_src(base_src)
    if source:
        return submit_fal(
            "fal-ai/flux/dev/image-to-image",
            {
                "prompt": prompt,
                "image_url": source,
                "strength": 0.62,
                "num_images": 1,
                "output_format": "png",
                "enable_safety_checker": True,
            },
        )
    model = (os.environ.get("FAL_MODEL") or DEFAULT_FAL).strip()
    return submit_fal(
        model,
        {
            "prompt": prompt,
            "image_size": {"width": STILL_W, "height": STILL_H},
            "num_images": 1,
            "output_format": "png",
            "enable_safety_checker": True,
        },
    )


def poll_flux(job: dict) -> str:
    if job.get("done"):
        return str(job["done"])
    model = str(job.get("model") or os.environ.get("FAL_MODEL") or DEFAULT_FAL).strip()
    request_id = str(job.get("request_id") or "").strip()
    status_url = str(job.get("status_url") or "").strip()
    response_url = str(job.get("response_url") or "").strip()
    if not status_url.startswith("https://"):
        status_url = f"https://queue.fal.run/{model}/requests/{request_id}/status"
    if not response_url.startswith("https://"):
        response_url = f"https://queue.fal.run/{model}/requests/{request_id}"
    headers = _fal_headers()
    deadline = time.time() + 22
    delay = 0.5
    while time.time() < deadline:
        time.sleep(delay)
        result = _http_json("GET", status_url, headers, timeout=15)
        status = str(result.get("status") or "")
        if status == "COMPLETED":
            done = _http_json("GET", response_url, headers, timeout=20)
            sample = _fal_image_url(done)
            if not sample:
                raise GenerateError("Painter returned no still")
            return sample
        if status in {"FAILED", "ERROR", "CANCELLED"}:
            raise GenerateError("Painter failed")
        delay = min(delay * 1.4, 2.0)
    raise GenerateError("Painter timed out")


def cutout_still(sample: str) -> str:
    try:
        job = submit_fal("fal-ai/imageutils/rembg", {"image_url": sample})
        return poll_flux(job)
    except GenerateError:
        return sample


def still_src(sample: str) -> str:
    req = urllib.request.Request(sample, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read()
            ctype = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return sample
    if not raw or len(raw) > 4_000_000:
        return sample
    if ctype not in {"image/jpeg", "image/png", "image/webp"}:
        ctype = "image/png"
    return f"data:{ctype};base64,{base64.b64encode(raw).decode('ascii')}"


def run_generate(user_id: int, body: dict) -> dict[str, Any]:
    blueprint = sanitize_blueprint(body)
    if not blueprint_has_notes(blueprint):
        raise GenerateError("Write a concept in chat first")
    require_keys()
    cap = daily_cap()
    used = generate_usage(user_id)
    if used >= cap:
        raise GenerateError(f"Daily generate cap reached ({cap})", 429)
    prompt = compose_prompt(blueprint)
    try:
        used, cap = reserve_generate(user_id, cap)
    except ValueError as error:
        raise GenerateError(str(error), 429) from error
    try:
        job = submit_flux(prompt, str(body.get("base_src") or ""))
    except GenerateError as error:
        refund_generate(user_id)
        raise error
    sample = cutout_still(poll_flux(job))
    return {
        "src": still_src(sample),
        "prompt": prompt,
        "used": used,
        "cap": cap,
        "remaining": max(0, cap - used),
    }
