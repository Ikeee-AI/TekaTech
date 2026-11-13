"""In-process cache of /query answers, so a repeated question skips the paid OpenAI calls.

Two ways to hit, both only inside the same scope (see scope_key):
  - exact: the normalized question text matches. Checked before any OpenAI call, so it skips
    both the embedding and the chat completion.
  - similar: the question's embedding has cosine similarity >= SIMILAR_THRESHOLD with a cached
    question's embedding. Needs the embedding first, then skips the chat completion, which is
    where nearly all of a question's cost is.

The scope is the set of gadget ids (order-insensitive; empty = global search), the
plain-language flag, PROMPT_VERSION and both model names. A different scope never matches,
so a comparison answer is never served to a global search, a technical answer never to a
plain-language request, and a prompt or model change starts from an empty cache.

Same rules as cache.py: entries live in one process and are only correct on a single worker;
.railway/railway.ts runs `--workers 1`. A multi-worker deploy would need a shared store, otherwise one
worker keeps serving answers another worker has already invalidated. Spec writes made through
the API call invalidate_gadget() / invalidate_all(); edits made outside the API (SQL Editor,
seed script) appear once the TTL runs out, and a deploy or restart empties the cache.

Only successful answers are stored. The caller never stores errors, 503s, answers cut off by
the token cap, or simulated failures (see routers/query.py). The number of entries is capped
and the oldest go first, because callers choose the question text.
"""

import math
import operator
import threading
import time
import unicodedata
from array import array
from dataclasses import dataclass
from uuid import UUID

MAX_ENTRIES = 200
TTL_SECONDS = 60 * 60
# Cosine similarity of two text-embedding-3-small vectors. 0.95 is deliberately strict: it
# catches rewordings such as "how long does the battery last" / "how long does its battery
# last", while questions that differ in what they ask about score lower.
SIMILAR_THRESHOLD = 0.95


@dataclass(frozen=True)
class CachedAnswer:
    response: dict  # QueryResponse fields, without the cache fields
    grounded: bool  # False for the "no relevant specs" answer


@dataclass
class _Entry:
    expires: float
    embedding: array  # array('d'): about a quarter of the memory of a list of floats
    norm: float
    answer: CachedAnswer


_lock = threading.Lock()
# Insertion-ordered: the first key is the oldest entry.
_entries: dict[tuple, _Entry] = {}
# Bumped by every invalidation. An answer generated from specs read before a spec write must
# not be stored after that write already cleared the cache (same idea as cache.py).
_generation = 0


def normalize_question(question: str) -> str:
    """Lowercase, collapse whitespace, strip trailing punctuation (any Unicode punctuation)."""
    text = " ".join(question.lower().split())
    while text and (text[-1].isspace() or unicodedata.category(text[-1]).startswith("P")):
        text = text[:-1]
    return text


def scope_key(gadget_ids: list[UUID] | None, plain_language: bool, prompt_version: str, *models: str) -> tuple:
    return (tuple(sorted({str(g) for g in gadget_ids or []})), bool(plain_language), prompt_version, *models)


def current_generation() -> int:
    """Read before answering; pass to store() so a write in between prevents storing."""
    with _lock:
        return _generation


def lookup_exact(scope: tuple, question: str) -> CachedAnswer | None:
    with _lock:
        entry = _entries.get((scope, normalize_question(question)))
        if entry and entry.expires > time.monotonic():
            return entry.answer
    return None


def lookup_similar(scope: tuple, embedding: list[float]) -> CachedAnswer | None:
    """The most similar grounded answer in this scope at or above SIMILAR_THRESHOLD.

    Only grounded answers count: for a "no relevant specs" answer the embedding is already
    paid for and retrieval itself is free, so re-running retrieval is both cheaper and exact.
    """
    embedding = _vector(embedding)
    query_norm = _norm(embedding)
    if not query_norm:
        return None
    best, best_score = None, SIMILAR_THRESHOLD
    now = time.monotonic()
    with _lock:
        candidates = [
            e for (entry_scope, _), e in _entries.items()
            if entry_scope == scope and e.answer.grounded and e.expires > now and e.norm
        ]
    for entry in candidates:
        if len(entry.embedding) != len(embedding):
            continue
        score = sum(map(operator.mul, embedding, entry.embedding)) / (query_norm * entry.norm)
        if score >= best_score:
            best, best_score = entry.answer, score
    return best


def store(scope: tuple, question: str, embedding: list[float], answer: CachedAnswer, generation: int) -> None:
    key = (scope, normalize_question(question))
    vector = _vector(embedding)
    with _lock:
        if generation != _generation:
            return
        _entries.pop(key, None)
        if len(_entries) >= MAX_ENTRIES:
            _evict()
        _entries[key] = _Entry(time.monotonic() + TTL_SECONDS, vector, _norm(vector), answer)


def invalidate_gadget(gadget_id: UUID | str) -> None:
    """Drop answers that could depend on this gadget's specs or name.

    That is every global-scope answer (retrieval searched all gadgets) and every scoped answer
    whose gadget set includes it. Answers scoped only to other gadgets stay.
    """
    gadget = str(gadget_id)
    global _generation
    with _lock:
        _generation += 1
        for key in [k for k in _entries if not k[0][0] or gadget in k[0][0]]:
            del _entries[key]


def invalidate_all() -> None:
    """For a spec write whose gadget is not known without another query (correction approval)."""
    clear()


def clear() -> None:
    global _generation
    with _lock:
        _generation += 1
        _entries.clear()


def _vector(embedding) -> array:
    """The embedding as array('d'); empty if it isn't a list of numbers.

    An empty vector has norm 0, so it never takes part in similar matching, and the exact
    match still works. The cache is an optimization: it must not fail a request whose
    OpenAI calls are already paid for.
    """
    try:
        return array("d", embedding)
    except (TypeError, ValueError):
        return array("d")


def _norm(vector) -> float:
    return math.sqrt(sum(x * x for x in vector))


def _evict() -> None:
    """Drop expired entries; if still full, drop the oldest insertion. Caller holds _lock."""
    now = time.monotonic()
    for key in [k for k, e in _entries.items() if e.expires <= now]:
        del _entries[key]
    while len(_entries) >= MAX_ENTRIES:
        del _entries[next(iter(_entries))]
