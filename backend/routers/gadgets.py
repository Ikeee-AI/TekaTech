from fastapi import APIRouter, Depends, HTTPException, Response
from uuid import UUID
import answer_cache
import cache
from schemas import GadgetCreate, GadgetUpdate, GadgetResponse, normalize_category
from supabase_client import supabase
from auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/gadgets", tags=["gadgets"])

# Server-side only (see cache.py): every write below invalidates, so the API's
# own edits show up immediately. No browser Cache-Control here, because the UI
# re-reads the list right after a create/edit and must not get a stale copy.
GADGETS_TTL_SECONDS = 60

@router.get("", response_model=list[GadgetResponse])
def list_gadgets(response: Response, category: str | None = None, brand: str | None = None):
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
def create_gadget(gadget: GadgetCreate, user=Depends(get_current_user)):
    payload = gadget.model_dump(mode="json", exclude_none=True)
    result = supabase.table("gadgets").insert(payload).execute()
    cache.invalidate("gadgets", "stats")
    return result.data[0]

@router.patch("/{gadget_id}", response_model=GadgetResponse)
def update_gadget(gadget_id: UUID, gadget: GadgetUpdate, user=Depends(get_current_user)):
    payload = gadget.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("gadgets").update(payload).eq("id", str(gadget_id)).execute()
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