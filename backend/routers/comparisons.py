import logging
import re
import secrets
import string
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

from auth import get_current_user
from rate_limit import limiter
from supabase_client import supabase

# Both routes need a signed-in user (owner decision, 14 Nov 2026): anonymous visitors may browse
# the catalog, but comparing gadgets and opening a shared comparison link need a session. The
# dependency runs before the body or slug is looked at, so an anonymous caller gets 401 and
# nothing is read or written. The rate limits stay.
router = APIRouter(prefix="/comparisons", tags=["comparisons"])
logger = logging.getLogger(__name__)

ALPHABET = string.ascii_lowercase + string.digits
SLUG_LENGTH = 7
# Exactly what _generate_slug produces (every link since Sprint 1), so a malformed slug is
# refused before it reaches the database. Answered with 404 like any unknown link, because the
# share page (frontend ShortLinkRedirect) treats 404 as "link not found"; a 422 would show a retry error.
SLUG_RE = re.compile(f"^[a-z0-9]{{{SLUG_LENGTH}}}$")
MAX_COMPARISON_GADGETS = 5  # matches the UI's "select 2-3 gadgets" framing, with headroom
MIN_COMPARISON_GADGETS = 2


class ComparisonCreate(BaseModel):
    # The cap applies to the list as sent, before duplicates are removed.
    gadget_ids: list[UUID] = Field(max_length=MAX_COMPARISON_GADGETS)

    @field_validator("gadget_ids")
    @classmethod
    def unique_and_enough(cls, value: list[UUID]) -> list[UUID]:
        # dict.fromkeys keeps the order the user picked while dropping repeats.
        unique = list(dict.fromkeys(value))
        if len(unique) < MIN_COMPARISON_GADGETS:
            raise PydanticCustomError(
                "comparison_too_few",
                "Pick at least {minimum} different gadgets to compare.",
                {"minimum": MIN_COMPARISON_GADGETS},
            )
        return unique


def _generate_slug(length: int = SLUG_LENGTH) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


@router.post("", status_code=201)
@limiter.limit("20/hour")
def create_comparison_link(request: Request, payload: ComparisonCreate, user=Depends(get_current_user)):
    ids = [str(i) for i in payload.gadget_ids]

    # One query: every id must be a gadget that exists, or the link would open
    # on a comparison with missing columns.
    try:
        found = supabase.table("gadgets").select("id").in_("id", ids).execute().data or []
    except Exception as exc:
        logger.warning("Gadget lookup failed while creating a comparison link: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail="Couldn't create the link right now. Try again.") from None
    if {str(row.get("id")) for row in found} != set(ids):
        raise HTTPException(status_code=404, detail="One or more gadgets in this comparison no longer exist.")

    slug = None
    for _ in range(5):
        candidate = _generate_slug()
        existing = supabase.table("comparison_links").select("id").eq("slug", candidate).execute()
        if not existing.data:
            slug = candidate
            break
    if slug is None:
        raise HTTPException(status_code=500, detail="Could not generate a unique link, try again")

    result = (
        supabase.table("comparison_links")
        .insert({"slug": slug, "gadget_ids": ids})
        .execute()
    )
    return result.data[0]


@router.get("/{slug}")
@limiter.limit("60/minute")
def resolve_comparison_link(
    request: Request,
    slug: str,
    user=Depends(get_current_user),
):
    if not SLUG_RE.fullmatch(slug):
        raise HTTPException(status_code=404, detail="Link not found")
    result = supabase.table("comparison_links").select("*").eq("slug", slug).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Link not found")
    row = result.data[0]

    # Atomic increment via a DB-side function (see sql/increment_comparison_view_count.sql) —
    # a select-then-update from here would lose updates under concurrent requests.
    # Best-effort: the view count is a statistic, so a failed increment (function not
    # applied yet, transient database error) must never stop the link from opening.
    try:
        supabase.rpc("increment_comparison_view_count", {"link_slug": slug}).execute()
    except Exception as exc:
        logger.warning("Comparison view count not incremented for a link: %s", type(exc).__name__, exc_info=True)

    return {"slug": slug, "gadget_ids": row["gadget_ids"]}
