from collections import Counter

from fastapi import APIRouter, Query, Response

import cache
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

    # Count how often each question (normalized) was asked, keep the original casing
    normalized_counts = Counter(h["query_text"].strip().lower() for h in history)
    seen_original = {}
    for h in history:
        key = h["query_text"].strip().lower()
        if key not in seen_original:
            seen_original[key] = h["query_text"].strip()

    ranked = sorted(normalized_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [{"question": _shorten(seen_original[key]), "count": count} for key, count in ranked]