import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response

import answer_cache
import cache
from schemas import (
    MAX_BRAND_CHARS,
    MAX_CATEGORY_CHARS,
    GadgetCreate,
    GadgetResponse,
    GadgetUpdate,
    normalize_category,
)
from supabase_client import supabase
from auth import get_current_admin_user

router = APIRouter(prefix="/gadgets", tags=["gadgets"])
logger = logging.getLogger(__name__)

# Database write failed or returned no row: a plain sentence, details go to the log.
DETAIL_SAVE_FAILED = "Couldn't save the gadget right now. Try again in a moment."

# Server-side only (see cache.py): every write below invalidates, so the API's
# own edits show up immediately. No browser Cache-Control here, because the UI
# re-reads the list right after a create/edit and must not get a stale copy.
GADGETS_TTL_SECONDS = 60

# Filter values are part of the public cache key (cache.py), so they are bounded by the
# longest value a saved gadget can hold (schemas.py): category 60, brand 80.
@router.get("", response_model=list[GadgetResponse])
def list_gadgets(
    response: Response,
    category: str | None = Query(None, max_length=MAX_CATEGORY_CHARS),
    brand: str | None = Query(None, max_length=MAX_BRAND_CHARS),
):
    # Same spelling rule as saving (#78), so ?category=smartphone finds "Smartphone".
    category = normalize_category(category) or None

    def load():
        query = supabase.table("gadgets").select("*")
        if category:
            query = query.eq("category", category)
        if brand:
            query = query.eq("brand", brand)
        return query.order("created_at", desc=True).execute().data

    data, hit = cache.get_or_load("gadgets", ("list", category, brand), GADGETS_TTL_SECONDS, load)
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return data

@router.get("/{gadget_id}", response_model=GadgetResponse)
def get_gadget(gadget_id: UUID, response: Response):
    def load():
        result = supabase.table("gadgets").select("*").eq("id", str(gadget_id)).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Gadget not found")
        return result.data[0]

    data, hit = cache.get_or_load("gadgets", ("one", str(gadget_id)), GADGETS_TTL_SECONDS, load)
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return data

@router.post("", response_model=GadgetResponse, status_code=201)
def create_gadget(gadget: GadgetCreate, user=Depends(get_current_admin_user)):
    payload = gadget.model_dump(mode="json", exclude_none=True)
    try:
        result = supabase.table("gadgets").insert(payload).execute()
    except Exception as exc:
        logger.warning("Gadget insert failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED) from None
    finally:
        # Even a failed call may have written; dropping the cache is always safe.
        cache.invalidate("gadgets", "stats")
    if not result.data:
        logger.warning("Gadget insert returned no row")
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED)
    return result.data[0]

@router.patch("/{gadget_id}", response_model=GadgetResponse)
def update_gadget(gadget_id: UUID, gadget: GadgetUpdate, user=Depends(get_current_admin_user)):
    # exclude_unset, not exclude_none: an omitted field is left alone, while an
    # explicit null clears release_date / price_php / image_url (GadgetUpdate
    # refuses null for the required columns).
    payload = gadget.model_dump(mode="json", exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = supabase.table("gadgets").update(payload).eq("id", str(gadget_id)).execute()
    except Exception as exc:
        logger.warning("Gadget update failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED) from None
    finally:
        cache.invalidate("gadgets", "stats")
        # Saved AI answers name the gadget in their sources (answer_cache.py).
        answer_cache.invalidate_gadget(gadget_id)
    if not result.data:
        raise HTTPException(status_code=404, detail="Gadget not found")
    return result.data[0]

@router.delete("/{gadget_id}", status_code=204)
def delete_gadget(gadget_id: UUID, user=Depends(get_current_admin_user)):
    result = supabase.table("gadgets").delete().eq("id", str(gadget_id)).execute()
    cache.invalidate("gadgets", "stats")
    # Its spec rows are deleted with it (on delete cascade), so answers citing them go too.
    answer_cache.invalidate_gadget(gadget_id)
    if not result.data:
        raise HTTPException(status_code=404, detail="Gadget not found")