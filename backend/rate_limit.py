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
    get_remote_address returns. Behind Render's proxy that peer is the proxy,
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


def verify_storage_reachable() -> None:
    """Fail fast at startup if the configured limiter storage isn't usable.

    Without this, a typo'd or unreachable storage URI surfaces later as a
    per-request error (or worse, goes unnoticed) rather than at boot.
    """
    try:
        healthy = limiter.limiter.storage.check()
    except Exception as exc:  # noqa: BLE001 - surfaced with context below
        raise RuntimeError(
            f"Rate limiter storage {settings.rate_limit_storage_uri!r} could not be reached: {exc}"
        ) from exc

    if not healthy:
        raise RuntimeError(
            f"Rate limiter storage {settings.rate_limit_storage_uri!r} reported itself unhealthy."
        )
