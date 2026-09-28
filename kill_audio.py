"""Resolve unofficial collection kill-audio URLs from the Valorant wiki."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request

FANDOM_API = "https://valorant.fandom.com/api.php"
_CACHE: dict[str, list[str]] = {}

KILL_AUDIO_FILES = {
    "rgx 11z pro": "RGX 11z Pro",
    "sentinels of light": "Sentinels of Light",
    "prelude to chaos": "Prelude to Chaos",
    "neo frontier": "Neo Frontier",
    "gaia's vengeance": "Gaia's Vengeance",
    "gravitational uranium neuroblaster": "Gravitational Uranium Neuroblaster",
    "radiant crisis 001": "Radiant Crisis 001",
    "valorant go! vol. 1": "VALORANT GO! Vol. 1",
    "valorant go! vol. 2": "VALORANT GO! Vol. 2",
    "black.market": "Black.Market",
}

_KILL_INDEX = re.compile(r"kill\s+(\d+)", re.I)


def wiki_kill_title(family: str) -> str:
    key = (family or "").strip().lower()
    if key in KILL_AUDIO_FILES:
        return KILL_AUDIO_FILES[key]
    return " ".join(
        word if word in {"and", "of"} else word[:1].upper() + word[1:]
        for word in key.split()
        if word
    )


def resolve_kill_audio(family: str) -> list[str]:
    key = (family or "").strip().lower()
    if not key:
        return []
    if key in _CACHE:
        return _CACHE[key]
    base = wiki_kill_title(key)
    if not base:
        _CACHE[key] = []
        return []
    titles = "|".join(f"File:{base} Kill {n}.mp3" for n in range(1, 6))
    url = FANDOM_API + "?" + urllib.parse.urlencode(
        {
            "action": "query",
            "titles": titles,
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
        }
    )
    request = urllib.request.Request(url, headers={"User-Agent": "VaLocker/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return []
    found: dict[int, str] = {}
    for page in ((payload.get("query") or {}).get("pages") or {}).values():
        if page.get("missing") is not None:
            continue
        info = page.get("imageinfo") or []
        file_url = info[0].get("url") if info else ""
        match = _KILL_INDEX.search(str(page.get("title") or ""))
        if file_url and match:
            found[int(match.group(1))] = file_url
    urls = [found[n] for n in range(1, 6) if n in found]
    _CACHE[key] = urls
    return urls
