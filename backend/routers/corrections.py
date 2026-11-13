import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from pydantic_core import PydanticCustomError

import answer_cache
from supabase_client import supabase
from auth import get_current_user, get_current_admin_user
from rate_limit import limiter
from routers.specs import MAX_RAW_TEXT_LENGTH, MAX_RAW_TEXT_TOKENS
from tokens import count_embedding_tokens

logger = logging.getLogger(__name__)

router = APIRouter(tags=["corrections"])

# An approved correction replaces a spec chunk's text, which is embedded later by
# POST .../specs/{id}/index. Same char + token caps as spec ingestion, so an
# approved correction can always be indexed (index_spec refuses > MAX_RAW_TEXT_TOKENS).
MAX_CORRECTION_CHARS = MAX_RAW_TEXT_LENGTH
MAX_CORRECTION_TOKENS = MAX_RAW_TEXT_TOKENS


class CorrectionCreate(BaseModel):
    suggested_content: str

    @field_validator("suggested_content")
    @classmethod
    def within_limits(cls, value: str) -> str:
        # Stripped first, so whitespace-only text is refused and is never stored.
        value = value.strip()
        if not value:
            raise PydanticCustomError("suggestion_empty", "Write the corrected spec text.")
        # Characters first (free), then tokens (the real limit).
        if len(value) > MAX_CORRECTION_CHARS:
            raise PydanticCustomError(
                "suggestion_too_long",
                "Suggested text is {chars} characters; the limit is {limit}.",
                {"chars": len(value), "limit": MAX_CORRECTION_CHARS},
            )
        # Embedding tokens (cl100k_base): approved text goes to embed_texts, not a prompt.
        tokens = count_embedding_tokens(value)
        if tokens > MAX_CORRECTION_TOKENS:
            raise PydanticCustomError(
                "suggestion_too_many_tokens",
                "Suggested text is {tokens} tokens; the limit is {limit}. "
                "Shorten it to the part that needs fixing.",
                {"tokens": tokens, "limit": MAX_CORRECTION_TOKENS},
            )
        return value


class CorrectionResolve(BaseModel):
    action: str


@router.post("/specs/{spec_id}/corrections", status_code=201)
@limiter.limit("20/hour")
def submit_correction(
    request: Request, spec_id: UUID, payload: CorrectionCreate, user=Depends(get_current_user)
):
    spec_exists = supabase.table("spec_documents").select("id").eq("id", str(spec_id)).execute()
    if not spec_exists.data:
        raise HTTPException(status_code=404, detail="Spec not found")

    result = (
        supabase.table("spec_corrections")
        .insert(
            {
                "spec_document_id": str(spec_id),
                "submitted_by": user.id,
                "suggested_content": payload.suggested_content,
                "status": "pending",
            }
        )
        .execute()
    )
    return result.data[0]


# Bounds for the submitter's own history. The nav badge only needs recent
# decisions, and a long-time contributor shouldn't make every page load pull
# their whole history.
MY_CORRECTIONS_LIMIT = 50
SPEC_EXCERPT_CHARS = 200


def _excerpt(text: str | None) -> str:
    text = (text or "").strip()
    if len(text) <= SPEC_EXCERPT_CHARS:
        return text
    return text[:SPEC_EXCERPT_CHARS].rstrip() + "…"


# Signed-in GETs call Supabase Auth on every request (the navbar badge polls this one), so
# they get a generous per-client limit that a normal session never reaches.
AUTHED_READ_LIMIT = "120/minute"


@router.get("/corrections/mine")
@limiter.limit(AUTHED_READ_LIMIT)
def list_my_corrections(request: Request, user=Depends(get_current_user)):
    """The caller's own corrections, newest first, so a submitter can see
    whether each one was approved or rejected (issue #109).

    The submitter is always the authenticated user: there is deliberately no
    user-id parameter. The backend uses the service-role key, so this filter
    is the only thing keeping one user's suggestions private from another.
    reviewed_by (the reviewing admin's id) is not selected.
    """
    try:
        result = (
            supabase.table("spec_corrections")
            .select(
                "id, spec_document_id, submitted_by, suggested_content, status, created_at, reviewed_at, "
                "spec_documents(content, gadget_id, gadgets(id, name, brand))"
            )
            .eq("submitted_by", user.id)
            .order("created_at", desc=True)
            .limit(MY_CORRECTIONS_LIMIT)
            .execute()
        )
    except Exception as exc:
        # The navbar badge calls this on every page change; a dropped database
        # connection must be a clean 503 (with CORS headers), not a bare 500.
        logger.warning("Listing own corrections failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't load your suggestions right now.") from None

    items = []
    for row in result.data or []:
        # Defense in depth on top of the query filter: never return a row that
        # isn't the caller's, even if the filter above were lost in a refactor.
        if str(row.get("submitted_by")) != str(user.id):
            continue
        spec = row.get("spec_documents") or {}
        gadget = spec.get("gadgets") or None
        items.append(
            {
                "id": row["id"],
                "status": row["status"],
                "suggested_content": row["suggested_content"],
                "created_at": row.get("created_at"),
                "reviewed_at": row.get("reviewed_at"),
                "spec_id": row.get("spec_document_id"),
                "spec_excerpt": _excerpt(spec.get("content")),
                "gadget": (
                    {
                        "id": gadget.get("id") or spec.get("gadget_id"),
                        "name": gadget.get("name"),
                        "brand": gadget.get("brand"),
                    }
                    if gadget
                    else None
                ),
            }
        )
    return items[:MY_CORRECTIONS_LIMIT]


@router.get("/corrections/pending-count")
def pending_corrections_count(user=Depends(get_current_admin_user)):
    """Number of corrections waiting for review, for the admin nav badge.

    Asks the database for an exact count with zero rows returned (the same
    count="exact" + limit(0) pattern scripts/sprint1_check.py uses against the
    real project), so the badge never downloads the queue itself.
    """
    try:
        result = (
            supabase.table("spec_corrections")
            .select("id", count="exact")
            .eq("status", "pending")
            .limit(0)
            .execute()
        )
    except Exception as exc:
        logger.warning("Counting pending corrections failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't count pending corrections right now.") from None
    if result.count is None:
        raise HTTPException(status_code=503, detail="Couldn't count pending corrections right now.")
    return {"count": result.count}


@router.get("/corrections")
def list_corrections(status: str = "pending", user=Depends(get_current_admin_user)):
    result = (
        supabase.table("spec_corrections")
        .select("*, spec_documents(content, gadget_id, gadgets(name, brand))")
        .eq("status", status)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.patch("/corrections/{correction_id}")
def resolve_correction(correction_id: UUID, payload: CorrectionResolve, user=Depends(get_current_admin_user)):
    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    existing = supabase.table("spec_corrections").select("*").eq("id", str(correction_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Correction not found")
    correction = existing.data[0]
    if correction.get("status", "pending") != "pending":
        raise HTTPException(status_code=409, detail=f"Correction was already {correction['status']}")

    new_status = "approved" if payload.action == "approve" else "rejected"
    now = datetime.now(timezone.utc).isoformat()

    # The status check is part of the UPDATE itself (... where status = 'pending'),
    # so two admins resolving the same correction at once can't both win: the
    # second update matches no row and gets a 409, and only the winner touches
    # the spec below. The two writes (correction row, then spec text) are still
    # separate requests; making them one transaction would need a DB function.
    updated = (
        supabase.table("spec_corrections")
        .update({"status": new_status, "reviewed_at": now, "reviewed_by": user.id})
        .eq("id", str(correction_id))
        .eq("status", "pending")
        .execute()
    )
    if not updated.data:
        current = supabase.table("spec_corrections").select("status").eq("id", str(correction_id)).execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Correction not found")
        status = current.data[0].get("status") or "resolved"
        if status == "pending":
            # Not resolved by anyone else, yet the write matched nothing.
            raise HTTPException(status_code=503, detail="Couldn't save the review right now. Try again.")
        raise HTTPException(status_code=409, detail=f"Correction was already {status}")

    if payload.action == "approve":
        # The old embedding describes the old text. Clear it and mark the spec pending, so
        # retrieval skips it (match_spec_documents only returns 'indexed' rows) until
        # POST .../index embeds the corrected text. Keeping 'indexed' made that call a no-op.
        supabase.table("spec_documents").update(
            {
                "content": correction["suggested_content"],
                "verified_at": now,
                "indexing_status": "pending",
                "embedding": None,
            }
        ).eq("id", correction["spec_document_id"]).execute()
        # Spec text changed. The correction row doesn't carry the gadget id, and approvals
        # are rare, so drop every saved AI answer rather than look it up (answer_cache.py).
        answer_cache.invalidate_all()

    return {"id": correction_id, "status": new_status}