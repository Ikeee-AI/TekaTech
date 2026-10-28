"""Request IDs and one timing log line per request.

Every response carries an `X-Request-ID` header. A caller-supplied value is
reused when it is short and plain (so a client or the deploy smoke can
correlate its own logs); anything else is replaced by a fresh uuid4 hex.

The log line holds method, path, status, duration and the request id. It
deliberately leaves out the query string, request/response bodies and every
header value except the ids: question text and bearer tokens must never reach
the host's logs. Render's own `Rndr-Id` is logged when present so a line can
be matched with Render's HTTP request log. `xff_entries` is only the number of
X-Forwarded-For entries (never the addresses); docs/deploy-runbook.md uses it
to confirm how many proxies sit in front of the API.

Written as plain ASGI rather than BaseHTTPMiddleware so streaming responses and
background tasks are untouched. It also turns an unhandled exception into a
JSON 500 that names the request id and nothing else (no exception text).
"""

import logging
import re
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
_SAFE_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")
_MAX_LOGGED_PATH = 200

logger = logging.getLogger("tekatech.request")
# Uvicorn configures only its own loggers, so without a handler these INFO lines
# would be dropped. Propagation stays on (nothing is attached to the root logger
# in production, so lines are not duplicated; pytest's caplog relies on it).
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     %(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)


def safe_request_id(value: str | None) -> str | None:
    """Return the value if it is 1-64 chars of [A-Za-z0-9_-], else None."""
    if value and _SAFE_ID.fullmatch(value):
        return value
    return None


def _header(scope: Scope, name: bytes) -> str | None:
    for key, value in scope.get("headers", []):
        if key == name:
            return value.decode("latin-1")
    return None


def _xff_entries(scope: Scope) -> int:
    return sum(
        len([part for part in value.decode("latin-1").split(",") if part.strip()])
        for key, value in scope.get("headers", [])
        if key == b"x-forwarded-for"
    )


def _loggable_path(path: str) -> str:
    # Path parameters are ids/slugs, but a crafted path could carry newlines to
    # forge log lines; keep printable characters only and cap the length.
    cleaned = "".join(ch if ch.isprintable() and ch != " " else "?" for ch in path)
    return cleaned[:_MAX_LOGGED_PATH]


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = safe_request_id(_header(scope, b"x-request-id")) or uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        started = time.perf_counter()
        status = 500
        response_started = False

        async def send_with_id(message: Message) -> None:
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        except Exception:
            # Full traceback goes to the server log only, tagged with the id the
            # client receives, so a reported id leads straight to the cause.
            logger.exception("unhandled error request_id=%s", request_id)
            if response_started:
                raise
            response = JSONResponse(
                {"detail": "Internal server error", "request_id": request_id}, status_code=500
            )
            await response(scope, receive, send_with_id)
        finally:
            duration_ms = (time.perf_counter() - started) * 1000
            rndr_id = safe_request_id(_header(scope, b"rndr-id"))
            logger.info(
                "request method=%s path=%s status=%s duration_ms=%.1f request_id=%s rndr_id=%s xff_entries=%d",
                scope.get("method", "?"),
                _loggable_path(scope.get("path", "")),
                status,
                duration_ms,
                request_id,
                rndr_id or "-",
                _xff_entries(scope),
            )
