import logging

import httpx
from supabase import Client, ClientOptions, create_client

from config import settings

logger = logging.getLogger(__name__)

# One shared HTTP client for every Supabase call (database, auth, storage).
#
# The library default is an HTTP/2 client shared across FastAPI's worker
# threads. When Supabase closes that connection, every request in flight on it
# fails with httpx.RemoteProtocolError ("Server disconnected"), which surfaced
# as random 500s on plain reads. So: HTTP/1.1 connections (one request each),
# idle connections recycled before the server drops them, and one retry for
# requests that are safe to repeat.

# Re-sending these cannot create a duplicate row. POST (inserts, RPCs) and
# PATCH are never retried: the first attempt may already have been applied.
RETRYABLE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "PUT", "DELETE"})
KEEPALIVE_EXPIRY_SECONDS = 20.0
TIMEOUT = httpx.Timeout(120.0, connect=10.0)  # 120 s = postgrest's own default


class RetryOnDisconnectTransport(httpx.BaseTransport):
    """Retries a safe request once when the server dropped the connection."""

    def __init__(self, inner: httpx.BaseTransport):
        self._inner = inner

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        try:
            return self._inner.handle_request(request)
        except httpx.RemoteProtocolError:
            if request.method not in RETRYABLE_METHODS:
                raise
            logger.info("Supabase connection dropped; retrying %s %s once", request.method, request.url.path)
            return self._inner.handle_request(request)

    def close(self) -> None:
        self._inner.close()


def build_http_client() -> httpx.Client:
    inner = httpx.HTTPTransport(
        http2=False,
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10, keepalive_expiry=KEEPALIVE_EXPIRY_SECONDS),
    )
    return httpx.Client(transport=RetryOnDisconnectTransport(inner), timeout=TIMEOUT, follow_redirects=True)


supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_key,
    options=ClientOptions(httpx_client=build_http_client()),
)
