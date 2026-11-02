"""TechSpecs API client (https://api.techspecs.io, v5). Shipped disabled.

TechSpecs' terms forbid downloading or caching their data without written authorization, so
`settings.techspecs_enabled` defaults to False and the routes in routers/techspecs.py refuse
before anything here runs. This module never reads the flag itself: callers check it first.

Only two calls are made, both GET with `x-api-id` / `x-api-key` headers:
- search(query, page, size) -> /v5/products/search
- get_product(product_id)   -> /v5/products/{product_id}?lang=en

The detail response schema is not documented, so parsing is defensive: find the product object,
then flatten its nested fields into plain "Section / Key: value" lines. Provider failures become
TechSpecsError with a `kind`; neither its message nor any log line carries the credentials or
the response body.

httpx is already installed at runtime as a dependency of openai and supabase.
"""
from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.techspecs.io/v5"
TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# Product ids go into a URL path, so only a conservative character set is accepted.
PRODUCT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

# Flattening limits: the product text is later saved through the normal spec path, which has
# its own character and embedding-token caps; these just keep one odd response bounded.
MAX_DEPTH = 4
MAX_LINES = 400
MAX_KEY_CHARS = 80
MAX_VALUE_CHARS = 300
# Internal ids and sections that hold pictures or links, not specifications.
SKIPPED_KEYS = {"id", "_id", "image", "images", "thumbnail", "thumbnails", "photo", "photos", "links", "url", "urls"}

_WHITESPACE = re.compile(r"\s+")


class TechSpecsError(Exception):
    """kind: not_configured | auth | not_found | rate_limited | timeout | unavailable | bad_response"""

    def __init__(self, kind: str, status_code: int | None = None):
        super().__init__(kind)
        self.kind = kind
        self.status_code = status_code


def _credentials() -> tuple[str, str]:
    api_id = settings.techspecs_api_id.get_secret_value() if settings.techspecs_api_id else ""
    api_key = settings.techspecs_api_key.get_secret_value() if settings.techspecs_api_key else ""
    if not api_id.strip() or not api_key.strip():
        raise TechSpecsError("not_configured")
    return api_id.strip(), api_key.strip()


def _make_client() -> httpx.Client:
    """Separate so tests can swap in an httpx.MockTransport."""
    return httpx.Client(base_url=BASE_URL, timeout=TIMEOUT)


def _get(path: str, params: dict[str, Any]) -> Any:
    api_id, api_key = _credentials()
    headers = {"x-api-id": api_id, "x-api-key": api_key, "accept": "application/json"}
    try:
        with _make_client() as http:
            response = http.get(path, params=params, headers=headers)
    except httpx.TimeoutException:
        logger.warning("techspecs: request timed out")
        raise TechSpecsError("timeout") from None
    except httpx.HTTPError as exc:
        logger.warning("techspecs: request failed (%s)", type(exc).__name__)
        raise TechSpecsError("unavailable") from None

    status = response.status_code
    if status >= 400:
        logger.warning("techspecs: HTTP %s", status)
        if status in (401, 403):
            raise TechSpecsError("auth", status)
        if status == 404:
            raise TechSpecsError("not_found", status)
        if status == 429:
            raise TechSpecsError("rate_limited", status)
        raise TechSpecsError("unavailable", status)
    try:
        return response.json()
    except ValueError:
        logger.warning("techspecs: response was not JSON")
        raise TechSpecsError("bad_response", status) from None


def _clean(value: Any, limit: int) -> str:
    text = _WHITESPACE.sub(" ", "".join(ch if ch.isprintable() else " " for ch in str(value))).strip()
    return text[:limit]


def _lookup(obj: Any, *names: str) -> Any:
    """Case-insensitive dict lookup of the first name present."""
    if not isinstance(obj, dict):
        return None
    lowered = {str(k).lower(): v for k, v in obj.items()}
    for name in names:
        if name.lower() in lowered:
            return lowered[name.lower()]
    return None


def _items(payload: Any) -> list:
    """The list of results, wherever the response put it."""
    if isinstance(payload, list):
        return payload
    for candidate in (_lookup(payload, "data"), payload):
        if isinstance(candidate, list):
            return candidate
        found = _lookup(candidate, "items", "results", "products")
        if isinstance(found, list):
            return found
    return []


def _summary(item: Any) -> dict | None:
    """id/brand/model/category from one search result or product, or None without an id."""
    if not isinstance(item, dict):
        return None
    product = _lookup(item, "product")
    sources = [product, item] if isinstance(product, dict) else [item]
    fields = {}
    for name, keys in (
        ("id", ("id", "_id", "product_id")),
        ("brand", ("brand",)),
        ("model", ("model", "name")),
        ("category", ("category",)),
        ("version", ("version",)),
    ):
        for source in sources:
            value = _lookup(source, *keys)
            if isinstance(value, (str, int)) and not isinstance(value, bool) and str(value).strip():
                fields[name] = _clean(value, MAX_VALUE_CHARS)
                break
    product_id = fields.get("id")
    if not product_id or not PRODUCT_ID_PATTERN.match(product_id):
        return None
    name = " ".join(part for part in (fields.get("brand"), fields.get("model"), fields.get("version")) if part)
    return {
        "id": product_id,
        "name": name or product_id,
        "brand": fields.get("brand"),
        "model": fields.get("model"),
        "category": fields.get("category"),
    }


def search(query: str, page: int = 0, size: int = 10) -> list[dict]:
    """Preview results only; nothing is stored. Items without a usable id are dropped."""
    payload = _get("/products/search", {"query": query, "page": page, "size": size})
    results = []
    for item in _items(payload):
        summary = _summary(item)
        if summary:
            results.append(summary)
    return results


def _product_object(payload: Any) -> dict | None:
    items = _items(payload)
    if items and isinstance(items[0], dict):
        return items[0]
    data = _lookup(payload, "data")
    if isinstance(data, dict) and data:
        return data
    if isinstance(payload, dict) and _lookup(payload, "product") is not None:
        return payload
    return None


def _scalar(value: Any) -> str | None:
    if value is None or isinstance(value, (dict, list)):
        return None
    if isinstance(value, bool):
        return "Yes" if value else "No"
    text = _clean(value, MAX_VALUE_CHARS)
    return text or None


def _flatten(obj: Any, path: list[str], lines: list[str], depth: int) -> None:
    if len(lines) >= MAX_LINES or depth > MAX_DEPTH:
        return
    if isinstance(obj, dict):
        for key, value in obj.items():
            key_text = _clean(key, MAX_KEY_CHARS)
            if not key_text or key_text.lower() in SKIPPED_KEYS:
                continue
            _flatten(value, path + [key_text], lines, depth + 1)
        return
    if isinstance(obj, list):
        scalars = [s for s in (_scalar(v) for v in obj) if s]
        if scalars and path:
            lines.append(f"{' / '.join(path)}: {_clean(', '.join(scalars), MAX_VALUE_CHARS)}")
        for value in obj:
            if isinstance(value, (dict, list)):
                _flatten(value, path, lines, depth + 1)
        return
    text = _scalar(obj)
    if text and path:
        lines.append(f"{' / '.join(path)}: {text}")


def get_product(product_id: str) -> dict:
    """{"id", "name", "lines": ["Display / Size: 6.1 in", ...]}. Raises TechSpecsError
    ("bad_response") when no product or no spec field can be found in the response."""
    if not PRODUCT_ID_PATTERN.match(product_id):
        raise TechSpecsError("not_found")
    payload = _get(f"/products/{product_id}", {"lang": "en"})
    product = _product_object(payload)
    if product is None:
        raise TechSpecsError("bad_response")
    lines: list[str] = []
    _flatten(product, [], lines, 0)
    if not lines:
        raise TechSpecsError("bad_response")
    summary = _summary(product) or {}
    return {"id": product_id, "name": summary.get("name") or product_id, "lines": lines[:MAX_LINES]}
