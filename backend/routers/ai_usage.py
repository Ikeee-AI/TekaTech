"""GET /me/ai-usage: how many of today's AI questions the signed-in user has left (ai_quota.py).

Always the session user's own count (no user-id parameter), like /me/gadgets. The frontend uses
it to show "X of 20 left today"; POST /query also sends X-AI-Questions-Limit and
X-AI-Questions-Remaining on every non-admin answer.
"""
from fastapi import APIRouter, Depends, Request, Response

import ai_quota
from auth import get_current_user
from rate_limit import limiter

router = APIRouter(prefix="/me", tags=["ai-usage"])


@router.get("/ai-usage")
@limiter.limit("60/minute")
def my_ai_usage(request: Request, response: Response, user=Depends(get_current_user)):
    """{limit, remaining, resets_at}; all three null for an admin (not limited).

    resets_at is an ISO 8601 UTC time: the next 00:00 UTC, which is 08:00 in Manila.
    """
    # A per-user number that changes with every question: never stored by a shared cache.
    response.headers["Cache-Control"] = "private, no-store"
    return ai_quota.usage(user)
