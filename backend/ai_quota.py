"""Per-user daily limit on AI questions (POST /query), owner decision 14 Nov 2026.

Every signed-in user may ask settings.ai_daily_question_limit questions (default 20) per UTC
calendar day; admins (app_metadata.is_admin) are exempt. This sits on top of the per-visitor
10/minute slowapi limit on /query, which still applies to everyone.

The counter lives in the same store as every other rate limit (limiter.limiter.storage, so
settings.rate_limit_storage_uri): memory:// counters are per process and reset on a redeploy,
which the owner accepted; redis:// makes them shared. No fallback store, like rate_limit.py.

Why the UTC date is part of the key: a `limits` fixed window starts at the FIRST hit, so a plain
"20/day" item would reset 24 hours after each user's first question, not at a fixed time. Keying
on the date makes every user's window the UTC day, which ends at 00:00 UTC = 08:00 Manila, the
time the 429 message names. The one-day expiry only cleans up yesterday's counters.

A question is counted when the route body starts: after sign-in and request validation (so a
401 or 422 costs nothing), before the cache is read (so a cached answer still counts, as does a
question that later fails with a 503: the counter has no refund).
"""
from datetime import datetime, time, timedelta, timezone

from fastapi import HTTPException
from limits import RateLimitItemPerDay

from config import settings
from rate_limit import limiter

LIMIT_HEADER = "X-AI-Questions-Limit"
REMAINING_HEADER = "X-AI-Questions-Remaining"
QUOTA_NAMESPACE = "ai-daily-questions"


def is_admin(user) -> bool:
    return bool((getattr(user, "app_metadata", None) or {}).get("is_admin"))


def daily_limit() -> int:
    return settings.ai_daily_question_limit


def _item() -> RateLimitItemPerDay:
    return RateLimitItemPerDay(daily_limit())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _identifiers(user, now: datetime) -> tuple[str, str, str]:
    return (QUOTA_NAMESPACE, str(user.id), now.date().isoformat())


def resets_at(now: datetime | None = None) -> datetime:
    """The next 00:00 UTC (08:00 Manila), when every user's count starts again."""
    now = now or _now()
    return datetime.combine(now.date() + timedelta(days=1), time.min, tzinfo=timezone.utc)


def exceeded_message(limit: int) -> str:
    return f"You've used today's {limit} AI questions. They reset at 8:00 AM (Manila time)."


def remaining(user) -> int:
    now = _now()
    return limiter.limiter.get_window_stats(_item(), *_identifiers(user, now)).remaining


def usage(user) -> dict:
    """GET /me/ai-usage body. Admins are not limited, so their limit and remaining are null."""
    if is_admin(user):
        return {"limit": None, "remaining": None, "resets_at": None}
    return {"limit": daily_limit(), "remaining": remaining(user), "resets_at": resets_at().isoformat()}


def consume(user) -> dict[str, str]:
    """Count one question for a non-admin user, or raise 429 when today's questions are used up.

    Returns the headers to put on the answer ({} for an admin). The 429 carries the same headers
    (remaining 0) plus Retry-After, the seconds until the counter resets.
    """
    if is_admin(user):
        return {}
    now = _now()
    item, ids = _item(), _identifiers(user, now)
    allowed = limiter.limiter.hit(item, *ids)
    headers = {
        LIMIT_HEADER: str(item.amount),
        REMAINING_HEADER: str(limiter.limiter.get_window_stats(item, *ids).remaining),
    }
    if not allowed:
        retry_after = max(1, int((resets_at(now) - now).total_seconds()))
        raise HTTPException(
            status_code=429,
            detail=exceeded_message(item.amount),
            headers={**headers, "Retry-After": str(retry_after)},
        )
    return headers
