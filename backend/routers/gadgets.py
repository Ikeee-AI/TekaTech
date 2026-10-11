from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from schemas import GadgetCreate, GadgetUpdate, GadgetResponse
from supabase_client import supabase
from auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/gadgets", tags=["gadgets"])

@router.get("", response_model=list[GadgetResponse])
def list_gadgets(category: str | None = None, brand: str | None = None):
    query = supabase.table("gadgets").select("*")
    if category:
        query = query.eq("category", category)
    if brand:
        query = query.eq("brand", brand)
    result = query.order("created_at", desc=True).execute()
    return result.data

@router.get("/{gadget_id}", response_model=GadgetResponse)
def get_gadget(gadget_id: UUID):
    result = supabase.table("gadgets").select("*").eq("id", str(gadget_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Gadget not found")
    return result.data[0]

@router.post("", response_model=GadgetResponse, status_code=201)
def create_gadget(gadget: GadgetCreate, user=Depends(get_current_user)):
    payload = gadget.model_dump(mode="json", exclude_none=True)
    result = supabase.table("gadgets").insert(payload).execute()
    return result.data[0]

@router.patch("/{gadget_id}", response_model=GadgetResponse)
def update_gadget(gadget_id: UUID, gadget: GadgetUpdate, user=Depends(get_current_user)):
    payload = gadget.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("gadgets").update(payload).eq("id", str(gadget_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Gadget not found")
    return result.data[0]

@router.delete("/{gadget_id}", status_code=204)
def delete_gadget(gadget_id: UUID, user=Depends(get_current_admin_user)):
    result = supabase.table("gadgets").delete().eq("id", str(gadget_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Gadget not found")