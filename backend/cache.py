"""In-process TTL cache for public read routes.

Cache-aside: a route asks for a key, gets the stored value while it is fresh,
and otherwise runs its own Supabase query and stores the result. Routes that
write the underlying tables call invalidate() for the matching namespace, so a
change made through this API is visible on the next read.

Like the "memory://" rate-limit storage, entries live in one process and are
only correct on a single worker; .railway/railway.ts runs `--workers 1`. A multi-worker
deploy would need a shared store, otherwise one worker keeps serving data
another worker has already invalidated. Edits made outside the API (SQL
Editor, seed script) appear once the TTL runs out.

Keys include query parameters, which callers control, so the number of entries
is capped. Only successful results are stored: a load that raises (404, DB
error) caches nothing.
"""

import threading
import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

MAX_ENTRIES = 256

_lock = threading.Lock()
_entries: dict[tuple, tuple[float, object]] = {}
# Bumped by invalidate(). A load that started before a write must not store
# the pre-write rows it read after the write already cleared the namespace.
_generations: dict[str, int] = {}


def get_or_load(namespace: str, key: tuple, ttl: float, load: Callable[[], T]) -> tuple[T, bool]:
    """Return (value, hit). On a miss, run load() and store its result for ttl seconds."""
    full_key = (namespace, *key)
    with _lock:
        entry = _entries.get(full_key)
        if entry and entry[0] > time.monotonic():
            return entry[1], True
        generation = _generations.get(namespace, 0)

    value = load()

    with _lock:
        if _generations.get(namespace, 0) == generation:
            _entries.pop(full_key, None)
            if len(_entries) >= MAX_ENTRIES:
                _evict()
            _entries[full_key] = (time.monotonic() + ttl, value)
    return value, False


def invalidate(*namespaces: str) -> None:
    with _lock:
        for namespace in namespaces:
            _generations[namespace] = _generations.get(namespace, 0) + 1
        for full_key in [k for k in _entries if k[0] in namespaces]:
            del _entries[full_key]


def clear() -> None:
    with _lock:
        _entries.clear()
        _generations.clear()


def _evict() -> None:
    """Drop expired entries; if still full, drop the oldest insertion. Caller holds _lock."""
    now = time.monotonic()
    for full_key in [k for k, (expires, _) in _entries.items() if expires <= now]:
        del _entries[full_key]
    while len(_entries) >= MAX_ENTRIES:
        del _entries[next(iter(_entries))]
