from collections import Counter

from fastapi import APIRouter, Query, Response

import cache
from routers.query import PRIVATE_QUESTION_PLACEHOLDER
from supabase_client import supabase

router = APIRouter(prefix="/stats", tags=["stats"])

# Aggregates for the home page: a minute out of date is fine, so browsers may
# reuse them too. Gadget and spec writes still invalidate the server copy.
STATS_TTL_SECONDS = 60
STATS_CACHE_CONTROL = f"public, max-age={STATS_TTL_SECONDS}"


def _mark(response: Response, hit: bool) -> None:
    response.headers["Cache-Control"] = STATS_CACHE_CONTROL
    response.headers["X-Cache"] = "HIT" if hit else "MISS"


@router.get("/spec-coverage")
def spec_coverage(response: Response):
    data, hit = cache.get_or_load("stats", ("spec-coverage",), STATS_TTL_SECONDS, _load_spec_coverage)
    _mark(response, hit)
    return data


def _load_spec_coverage():
    gadgets = supabase.table("gadgets").select("id").execute().data
    total = len(gadgets)

    specs = supabase.table("spec_documents").select("gadget_id").execute().data
    covered = len({s["gadget_id"] for s in specs})

    return {"covered": covered, "total": total}


# Bounded because the route is public and `limit` is part of the cache key: an
# unbounded value would let callers fill the stats cache with one entry per number.
TRENDING_DEFAULT = 5
TRENDING_MAX = 10
# Same cap /query puts on new questions (MAX_QUESTION_CHARS in routers/query.py).
# Rows saved before that cap can be longer; they are shortened for display here.
TRENDING_QUESTION_MAX_CHARS = 150
# A question must have been asked this many times before it is shown publicly.
TRENDING_MIN_COUNT = 2


def _shorten(question: str) -> str:
    if len(question) <= TRENDING_QUESTION_MAX_CHARS:
        return question
    return question[: TRENDING_QUESTION_MAX_CHARS - 1].rstrip() + "…"


@router.get("/trending-questions")
def trending_questions(response: Response, limit: int = Query(TRENDING_DEFAULT, ge=1, le=TRENDING_MAX)):
    data, hit = cache.get_or_load(
        "stats", ("trending-questions", limit), STATS_TTL_SECONDS, lambda: _load_trending(limit)
    )
    _mark(response, hit)
    return data


def _load_trending(limit: int):
    history = (
        supabase.table("query_history")
        .select("query_text, created_at")
        .order("created_at", desc=True)
        .limit(200)
        .execute()
        .data
    )

    if not history:
        return []

    # Private turns (a signed-in user's saved gadget question) are stored as a placeholder and
    # never shown. Everything else is counted by normalized text, keeping the original casing.
    history = [
        h
        for h in history
        if (h.get("query_text") or "").strip() and h["query_text"].strip() != PRIVATE_QUESTION_PLACEHOLDER
    ]
    normalized_counts = Counter(h["query_text"].strip().lower() for h in history)
    seen_original = {}
    for h in history:
        key = h["query_text"].strip().lower()
        if key not in seen_original:
            seen_original[key] = h["query_text"].strip()

    # Privacy: a question asked only once may be personal ("is this OK for my son's ...?"), so
    # only questions asked at least TRENDING_MIN_COUNT times can appear on the public list.
    repeated = [(key, count) for key, count in normalized_counts.items() if count >= TRENDING_MIN_COUNT]
    ranked = sorted(repeated, key=lambda x: x[1], reverse=True)[:limit]
    return [{"question": _shorten(seen_original[key]), "count": count} for key, count in ranked]