"""My Gadgets (S5-IK, 3 Nov 2026): a signed-in user's personal list of catalog gadgets.

The catalog is admin-curated (#195), so a regular user never creates gadgets: they
pick existing ones from the catalog cards. Every route here is for the session user
only; there is no user-id parameter, so nobody can read or change another user's list.
Table: backend/sql/user_gadgets.sql (apply in Supabase before deploying this router).
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from auth import get_current_user
from rate_limit import limiter
from supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/gadgets", tags=["my-gadgets"])

# A personal shortlist, not a second catalog. Keeps every dashboard load small.
MAX_MY_GADGETS = 50

DETAIL_UNAVAILABLE = "Couldn't load your gadgets right now. Try again in a moment."
DETAIL_SAVE_FAILED = "Couldn't update your gadgets right now. Try again in a moment."


def _rows_for(user_id: str):
    return (
        supabase.table("user_gadgets")
        .select("gadget_id, created_at, gadgets(*)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(MAX_MY_GADGETS)
        .execute()
        .data
    )


# Every /me GET calls Supabase Auth on each request: a per-client cap a normal session never hits.
AUTHED_READ_LIMIT = "120/minute"


@router.get("")
@limiter.limit(AUTHED_READ_LIMIT)
def list_my_gadgets(request: Request, user=Depends(get_current_user)):
    """The caller's gadgets, most recently added first: [{"added_at", "gadget": {...}}]."""
    try:
        rows = _rows_for(str(user.id))
    except Exception as exc:
        logger.warning("My gadgets read failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_UNAVAILABLE) from None
    # A row whose gadget vanished between delete and cascade is skipped, never shown half-empty.
    return [
        {"added_at": row["created_at"], "gadget": row["gadgets"]}
        for row in rows
        if row.get("gadgets")
    ]


@router.put("/{gadget_id}", status_code=204)
@limiter.limit("120/hour")
def add_my_gadget(request: Request, gadget_id: UUID, user=Depends(get_current_user)):
    """Add a catalog gadget to the caller's list. Adding one that is already there is a no-op."""
    uid, gid = str(user.id), str(gadget_id)
    if not supabase.table("gadgets").select("id").eq("id", gid).execute().data:
        raise HTTPException(status_code=404, detail="Gadget not found")

    existing = (
        supabase.table("user_gadgets").select("gadget_id").eq("user_id", uid).execute().data
    )
    if any(row["gadget_id"] == gid for row in existing):
        return Response(status_code=204)
    if len(existing) >= MAX_MY_GADGETS:
        raise HTTPException(
            status_code=409,
            detail=f"Your list holds up to {MAX_MY_GADGETS} gadgets. Remove one to add another.",
        )
    try:
        supabase.table("user_gadgets").insert({"user_id": uid, "gadget_id": gid}).execute()
    except Exception as exc:
        # Two quick clicks can race past the check above; the primary key keeps one row.
        if "duplicate key" in str(exc) or "23505" in str(exc):
            return Response(status_code=204)
        logger.warning("My gadgets insert failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED) from None
    return Response(status_code=204)


@router.delete("/{gadget_id}", status_code=204)
@limiter.limit("120/hour")
def remove_my_gadget(request: Request, gadget_id: UUID, user=Depends(get_current_user)):
    """Remove a gadget from the caller's list only (the catalog is untouched). Idempotent."""
    try:
        (
            supabase.table("user_gadgets")
            .delete()
            .eq("user_id", str(user.id))
            .eq("gadget_id", str(gadget_id))
            .execute()
        )
    except Exception as exc:
        logger.warning("My gadgets delete failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED) from None
    return Response(status_code=204)


# --- Per-gadget AI conversation (user_questions.sql, 3 Nov 2026) ---------------------------
# POST /query saves a signed-in user's single-gadget questions (routers/query.py,
# _save_thread_turn). These routes let the gadget page show and clear that user's thread.
THREAD_TURNS_SHOWN = 20


@router.get("/{gadget_id}/questions")
@limiter.limit(AUTHED_READ_LIMIT)
def list_my_gadget_questions(request: Request, gadget_id: UUID, user=Depends(get_current_user)):
    """The caller's latest questions about one gadget, oldest first (chat order), at most 20:
    [{"id", "question", "asked_at", "response": QueryResponse}]."""
    try:
        rows = (
            supabase.table("user_questions")
            .select("id, question, response, created_at")
            .eq("user_id", str(user.id))
            .eq("gadget_id", str(gadget_id))
            .order("created_at", desc=True)
            .limit(THREAD_TURNS_SHOWN)
            .execute()
            .data
        )
    except Exception as exc:
        logger.warning("Gadget questions read failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't load your earlier questions right now.") from None
    return [
        {"id": row["id"], "question": row["question"], "asked_at": row["created_at"], "response": row["response"]}
        for row in reversed(rows)
    ]


@router.delete("/{gadget_id}/questions", status_code=204)
@limiter.limit("60/hour")
def clear_my_gadget_questions(request: Request, gadget_id: UUID, user=Depends(get_current_user)):
    """Delete the caller's saved questions about one gadget (their thread only). Idempotent."""
    try:
        (
            supabase.table("user_questions")
            .delete()
            .eq("user_id", str(user.id))
            .eq("gadget_id", str(gadget_id))
            .execute()
        )
    except Exception as exc:
        logger.warning("Gadget questions delete failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't clear your questions right now.") from None
    return Response(status_code=204)
