import secrets
import string
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from rate_limit import limiter
from supabase_client import supabase

router = APIRouter(prefix="/comparisons", tags=["comparisons"])

ALPHABET = string.ascii_lowercase + string.digits
MAX_COMPARISON_GADGETS = 5  # matches the UI's "select 2-3 gadgets" framing, with headroom


class ComparisonCreate(BaseModel):
    gadget_ids: list[UUID] = Field(max_length=MAX_COMPARISON_GADGETS)


def _generate_slug(length: int = 7) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


@router.post("", status_code=201)
@limiter.limit("20/hour")
def create_comparison_link(request: Request, payload: ComparisonCreate):
    if len(payload.gadget_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 gadgets to compare")

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
        .insert({"slug": slug, "gadget_ids": [str(i) for i in payload.gadget_ids]})
        .execute()
    )
    return result.data[0]


@router.get("/{slug}")
def resolve_comparison_link(slug: str):
    result = supabase.table("comparison_links").select("*").eq("slug", slug).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Link not found")
    row = result.data[0]

    # Atomic increment via a DB-side function (see sql/increment_comparison_view_count.sql) —
    # a select-then-update from here would lose updates under concurrent requests.
    supabase.rpc("increment_comparison_view_count", {"link_slug": slug}).execute()

    return {"slug": slug, "gadget_ids": row["gadget_ids"]}