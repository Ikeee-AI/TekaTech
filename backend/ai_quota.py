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


# --- Web-search answers (24 Nov 2026) -------------------------------------------------------
# Same store and UTC-day keys as the question limit. Counted only when a web search is actually
# about to run (the saved specs didn't cover the question and the user allowed it), so a normal
# answer or a cached web answer costs nothing here.
WEB_NAMESPACE = "ai-daily-web-searches"
WEB_SITE_NAMESPACE = "ai-daily-web-searches-site"


def consume_web_search(user) -> bool:
    """Count one web search; False when the user's or the site's cap for today is used up.

    Admins skip the per-user cap but count toward the site cap, which protects the prepaid
    OpenAI balance. A cap of 0 turns web answers off.

    `hit` checks and counts in one step, so two requests at once can't both take the last search.
    The site is counted first: when it is full the user's count is untouched. If the user's own
    cap then turns out to be full (a race with the user's other tab), the site keeps that one hit,
    which errs toward fewer searches, never more (bug sweep, 24 Nov 2026).
    """
    now = _now()
    day = now.date().isoformat()
    site_limit = settings.web_search_site_daily_limit
    if site_limit <= 0:
        return False
    site_item, site_ids = RateLimitItemPerDay(site_limit), (WEB_SITE_NAMESPACE, "all", day)
    if is_admin(user):
        return limiter.limiter.hit(site_item, *site_ids)
    user_limit = settings.ai_daily_web_search_limit
    if user_limit <= 0:
        return False
    user_item, user_ids = RateLimitItemPerDay(user_limit), (WEB_NAMESPACE, str(user.id), day)
    if not limiter.limiter.test(user_item, *user_ids):
        return False
    if not limiter.limiter.hit(site_item, *site_ids):
        return False
    return limiter.limiter.hit(user_item, *user_ids)
