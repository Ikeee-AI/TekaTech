"""Admin overview (#206): catalog readiness, recent usage and AI spend, user counts. Admin-only, read-only.

Everything here is computed from existing tables; no new table or SQL. Nothing is cached, because
an admin opening this page wants current numbers (it is a handful of reads, not a public route).

The spend figure is an ESTIMATE FOR LOGGED ANSWERS ONLY. query_history is written only for grounded
/query answers, so it leaves out:
- general-knowledge answers (#172 keeps them out of query_history on purpose);
- answers cut off at ANSWER_MAX_COMPLETION_TOKENS (billed, then refused as a 503);
- the embedding calls made when specs are indexed (routers/specs.py).
Real spend is therefore higher. The app cannot read the OpenAI balance; the OpenAI dashboard is the
source of truth, and the response says so.
"""
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from auth import get_current_admin_user
from supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

USAGE_WINDOW_DAYS = 14
# The team works in Manila; the Philippines has no daylight saving, so a fixed offset is exact.
MANILA = timezone(timedelta(hours=8))
# PostgREST (Supabase) returns at most 1000 rows per request by default. At /query's rate limit and
# current traffic, 14 days is far below that; if it is ever reached the response says "truncated".
ROW_LIMIT = 1000

# OpenAI standard-tier prices in USD per 1M tokens, read from
# https://developers.openai.com/api/docs/pricing on 13 Nov 2026. Update them here if OpenAI changes them.
# prompt_tokens include any cached input, which OpenAI bills at a tenth of the input price, so a row
# with cached input is estimated slightly high; the missing calls listed above push the total low.
PRICE_PER_MILLION_USD = {
    "embedding": 0.02,  # text-embedding-3-small (the /query question embedding)
    "chat_input": 0.25,  # gpt-5-mini input
    "chat_output": 2.00,  # gpt-5-mini output (includes hidden reasoning tokens)
}
SPEND_NOTE = (
    "Estimate for logged answers only. It leaves out general-knowledge answers, answers cut off at "
    "the length limit and spec indexing, so real spend is higher. Check the OpenAI dashboard for the "
    "actual balance."
)
TOKEN_COLUMNS = ("embedding_tokens", "prompt_tokens", "completion_tokens")


@router.get("/overview")
def overview(_admin=Depends(get_current_admin_user)):
    now = datetime.now(timezone.utc)
    return {
        "generated_at": now.isoformat(),
        "catalog": _catalog(),
        "usage": _usage(now),
        "users": _users(),
    }


def _catalog():
    gadgets = supabase.table("gadgets").select("id, name").order("name").execute().data or []
    chunks = supabase.table("spec_documents").select("gadget_id, indexing_status").execute().data or []

    by_status: dict[str, int] = {}
    per_gadget: dict[str, dict[str, int]] = {}
    for chunk in chunks:
        status = chunk.get("indexing_status") or "pending"
        by_status[status] = by_status.get(status, 0) + 1
        counts = per_gadget.setdefault(str(chunk.get("gadget_id")), {"indexed": 0, "pending": 0})
        counts["indexed" if status == "indexed" else "pending"] += 1

    rows = []
    for g in gadgets:
        counts = per_gadget.get(str(g["id"]), {"indexed": 0, "pending": 0})
        rows.append({"id": g["id"], "name": g["name"], **counts})

    return {
        "gadgets": len(gadgets),
        "gadgets_with_indexed_specs": sum(1 for r in rows if r["indexed"] > 0),
        "gadgets_without_specs": [r["name"] for r in rows if r["indexed"] + r["pending"] == 0],
        "spec_chunks": {
            "total": len(chunks),
            "indexed": by_status.get("indexed", 0),
            # Anything not yet indexed (normally "pending") is waiting for Index All Pending.
            "not_indexed": len(chunks) - by_status.get("indexed", 0),
        },
        "per_gadget": rows,
    }


def _history_rows(since: datetime):
    """query_history rows since `since`. Falls back to no token columns if they were never added
    (sql/add_query_history_token_columns.sql), mirroring how /query writes the table."""
    def fetch(columns):
        return (
            supabase.table("query_history")
            .select(columns)
            .gte("created_at", since.isoformat())
            .order("created_at", desc=True)
            .limit(ROW_LIMIT)
            .execute()
            .data
            or []
        )

    try:
        return fetch("created_at, " + ", ".join(TOKEN_COLUMNS)), True
    except Exception:
        logger.warning("query_history token columns unavailable; showing question counts only")
        return fetch("created_at"), False


def _usage(now: datetime):
    today = now.astimezone(MANILA).date()
    first_day = today - timedelta(days=USAGE_WINDOW_DAYS - 1)
    since = datetime.combine(first_day, datetime.min.time(), tzinfo=MANILA)
    rows, has_tokens = _history_rows(since)

    days = {first_day + timedelta(days=i): _empty_day() for i in range(USAGE_WINDOW_DAYS)}
    rows_without_tokens = 0
    for row in rows:
        day = _manila_day(row.get("created_at"))
        if day not in days:
            continue
        bucket = days[day]
        bucket["questions"] += 1
        values = [row.get(col) for col in TOKEN_COLUMNS]
        if any(v is None for v in values):
            rows_without_tokens += 1
        for col, value in zip(TOKEN_COLUMNS, values):
            bucket[col] += value or 0

    day_rows = [{"date": d.isoformat(), **b, "estimated_cost_usd": _cost(b)} for d, b in sorted(days.items())]
    totals = _empty_day()
    for row in day_rows:
        for key in totals:
            totals[key] += row[key]
    totals["estimated_cost_usd"] = _cost(totals)

    return {
        "window_days": USAGE_WINDOW_DAYS,
        "timezone": "Asia/Manila",
        "days": day_rows,
        "totals": totals,
        "token_columns_present": has_tokens,
        "rows_without_tokens": rows_without_tokens,
        "truncated": len(rows) >= ROW_LIMIT,
        "prices_per_million_usd": PRICE_PER_MILLION_USD,
        "spend_note": SPEND_NOTE,
    }


def _empty_day():
    return {"questions": 0, **{col: 0 for col in TOKEN_COLUMNS}}


def _manila_day(value) -> date | None:
    if not value:
        return None
    try:
        stamp = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(MANILA).date()


def _cost(bucket) -> float:
    usd = (
        bucket["embedding_tokens"] * PRICE_PER_MILLION_USD["embedding"]
        + bucket["prompt_tokens"] * PRICE_PER_MILLION_USD["chat_input"]
        + bucket["completion_tokens"] * PRICE_PER_MILLION_USD["chat_output"]
    ) / 1_000_000
    return round(usd, 4)


def _users():
    return {"accounts": _account_count(), "my_gadgets_lists": _my_gadgets_list_count()}


def _my_gadgets_list_count() -> int | None:
    """Distinct users with at least one My Gadgets entry. None ("unavailable") if the read fails, for
    example on a database where sql/user_gadgets.sql was never applied, so the rest of the page still loads."""
    try:
        lists = supabase.table("user_gadgets").select("user_id").limit(ROW_LIMIT).execute().data or []
    except Exception:
        logger.exception("Counting My Gadgets lists failed")
        return None
    return len({row.get("user_id") for row in lists if row.get("user_id")})


def _account_count() -> int | None:
    """Number of auth users, through the service-role admin API. Counts only; no emails leave here.
    None (shown as "unavailable") if the admin API call fails, so one failure doesn't hide the page."""
    total, page, per_page = 0, 1, 1000
    try:
        while True:
            users = supabase.auth.admin.list_users(page=page, per_page=per_page)
            total += len(users)
            if len(users) < per_page:
                return total
            page += 1
    except Exception:
        logger.exception("Counting auth users failed")
        return None
