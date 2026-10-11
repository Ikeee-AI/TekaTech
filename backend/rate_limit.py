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
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.rate_limit_storage_uri)


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
