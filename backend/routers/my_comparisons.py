"""The signed-in user's saved AI conversation about one set of phones (S5-IK, 23 Nov 2026).

POST /query and POST /query/stream save a signed-in user's comparison questions (two or more
gadgets) in user_comparison_questions (backend/sql/user_comparison_questions.sql), keyed by the
sorted gadget ids. These routes let the compare page show and clear that user's thread. Always
scoped to the session user; there is no user-id parameter.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from auth import get_current_user
from rate_limit import limiter
from routers.comparisons import MAX_COMPARISON_GADGETS
from supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/comparisons", tags=["my-comparisons"])

AUTHED_READ_LIMIT = "120/minute"
THREAD_TURNS_SHOWN = 20


def comparison_key(gadget_ids) -> str:
    """The same phones in any order are one conversation: sorted, de-duplicated, comma-joined."""
    return ",".join(sorted({str(g).lower() for g in gadget_ids}))


def _parse_ids(ids: str) -> list[UUID]:
    try:
        parsed = list(dict.fromkeys(UUID(part.strip()) for part in ids.split(",") if part.strip()))
    except ValueError:
        raise HTTPException(status_code=422, detail="ids must be comma-separated gadget ids.") from None
    if not 2 <= len(parsed) <= MAX_COMPARISON_GADGETS:
        raise HTTPException(
            status_code=422, detail=f"A comparison has 2 to {MAX_COMPARISON_GADGETS} gadgets."
        )
    return parsed


@router.get("/questions")
@limiter.limit(AUTHED_READ_LIMIT)
def list_my_comparison_questions(request: Request, ids: str = Query(...), user=Depends(get_current_user)):
    """The caller's latest questions about these phones, oldest first (chat order), at most 20:
    [{"id", "question", "asked_at", "response": QueryResponse}]."""
    key = comparison_key(_parse_ids(ids))
    try:
        rows = (
            supabase.table("user_comparison_questions")
            .select("id, question, response, created_at")
            .eq("user_id", str(user.id))
            .eq("comparison_key", key)
            .order("created_at", desc=True)
            .limit(THREAD_TURNS_SHOWN)
            .execute()
            .data
        )
    except Exception as exc:
        logger.warning("Comparison questions read failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't load your earlier questions right now.") from None
    return [
        {"id": row["id"], "question": row["question"], "asked_at": row["created_at"], "response": row["response"]}
        for row in reversed(rows or [])
    ]


@router.delete("/questions", status_code=204)
@limiter.limit("60/hour")
def clear_my_comparison_questions(request: Request, ids: str = Query(...), user=Depends(get_current_user)):
    """Delete the caller's saved questions about these phones (their thread only). Idempotent."""
    key = comparison_key(_parse_ids(ids))
    try:
        (
            supabase.table("user_comparison_questions")
            .delete()
            .eq("user_id", str(user.id))
            .eq("comparison_key", key)
            .execute()
        )
    except Exception as exc:
        logger.warning("Comparison questions delete failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't clear your questions right now.") from None
    return Response(status_code=204)
