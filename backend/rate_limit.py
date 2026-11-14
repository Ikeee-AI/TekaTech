"""Shared rate limiter instance.

Split into its own module so both main.py (which registers it on the app)
and individual routers (which apply @limiter.limit(...) to specific
endpoints) can import it without a circular import.

Storage comes from settings.rate_limit_storage_uri and defaults to
"memory://" — per-process counters, correct only for a single worker. Any
multi-worker/multi-replica deploy must point it at a shared store, otherwise
each process silently enforces its own separate quota (e.g. 4 workers = 4x
the intended limit).

Deliberately no in_memory_fallback: if a configured shared store is
unreachable we want a loud failure, not a silent downgrade to per-process
limits that looks like it's working while the protection is gone.

Bucket key: see client_ip_key. Proxy headers are trusted only when
settings.trust_proxy_headers is on, and then only the proxy-appended
(rightmost) X-Forwarded-For entry is used.
"""

import ipaddress
from urllib.parse import urlsplit

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from config import settings


def _bucket(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> str:
    # One IPv6 subscriber usually holds a whole /64 and can rotate addresses
    # inside it freely, so per-address IPv6 buckets would be trivial to dodge.
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            return str(ip.ipv4_mapped)
        return str(ipaddress.IPv6Network((ip, 64), strict=False))
    return str(ip)


def client_ip_key(request: Request) -> str:
    """Rate-limit bucket for the caller.

    Default (trust_proxy_headers off): the socket peer, exactly what slowapi's
    get_remote_address returns. Behind the host's proxy (Railway) that peer is the proxy,
    so every visitor would share one bucket.

    With trust_proxy_headers on: the X-Forwarded-For entry appended by the
    trusted proxy, counted from the RIGHT (trusted_proxy_hops, default 1 =
    rightmost). A client can put anything in the header it sends, but proxies
    only append, so client-supplied entries are always to the left of the ones
    we trust and are never used. If that entry is missing or is not an IP
    address, fall back to the socket peer: never walk further left looking for
    a "valid" entry, because that is exactly where spoofed values live.
    """
    fallback = get_remote_address(request)
    if not settings.trust_proxy_headers:
        return fallback
    entries = [
        part.strip()
        for value in request.headers.getlist("x-forwarded-for")
        for part in value.split(",")
        if part.strip()
    ]
    hops = settings.trusted_proxy_hops
    if len(entries) < hops:
        return fallback
    try:
        return _bucket(ipaddress.ip_address(entries[-hops]))
    except ValueError:
        return fallback


limiter = Limiter(key_func=client_ip_key, storage_uri=settings.rate_limit_storage_uri)


def describe_storage_uri(uri: str) -> str:
    """scheme://host[:port] of a storage URI, for logs and errors.

    A redis URI can carry a password (redis://:secret@host:6379/0), so the user info,
    path and query are never shown. Anything unparseable is reported only by scheme.
    """
    try:
        parts = urlsplit(uri)
        host = parts.hostname or ""
        port = f":{parts.port}" if parts.port else ""
    except ValueError:
        return f"{uri.split(':', 1)[0]}://<unparseable>"
    return f"{parts.scheme}://{host}{port}"


def verify_storage_reachable() -> None:
    """Fail fast at startup if the configured limiter storage isn't usable.

    Without this, a typo'd or unreachable storage URI surfaces later as a
    per-request error (or worse, goes unnoticed) rather than at boot.
    The message names the store by scheme and host only, and the underlying error by type:
    driver error text can echo the connection string.
    """
    where = describe_storage_uri(settings.rate_limit_storage_uri)
    try:
        healthy = limiter.limiter.storage.check()
    except Exception as exc:  # noqa: BLE001 - surfaced with context below
        raise RuntimeError(
            f"Rate limiter storage {where} could not be reached ({type(exc).__name__})"
        ) from None

    if not healthy:
        raise RuntimeError(f"Rate limiter storage {where} reported itself unhealthy.")
