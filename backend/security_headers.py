"""Security headers on every API response.

The API only serves JSON, so the Content-Security-Policy allows nothing to load and
nothing to frame it. The interactive docs (/docs, /redoc) are HTML pages that load
Swagger UI / ReDoc scripts from a CDN with inline bootstrap code, so they are the one
place the CSP is left off; every other header still applies there.

Plain ASGI (like request_id.py), so streaming responses are untouched. Added as the
outermost middleware in main.py, so 429s, CORS preflights and the JSON 500 from
RequestIdMiddleware carry the headers too.
"""

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'"

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    # Browsers ignore HSTS over plain http (local dev), so it is safe to send everywhere.
    "Strict-Transport-Security": "max-age=31536000",
}

# HTML documentation pages that need scripts/styles; JSON (incl. /openapi.json) keeps the CSP.
DOCS_PATHS = frozenset({"/docs", "/docs/oauth2-redirect", "/redoc"})


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        with_csp = scope.get("path") not in DOCS_PATHS

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in SECURITY_HEADERS.items():
                    headers.setdefault(name, value)
                if with_csp:
                    headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
            await send(message)

        await self.app(scope, receive, send_with_headers)
