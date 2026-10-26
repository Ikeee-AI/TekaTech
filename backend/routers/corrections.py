from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import answer_cache
from supabase_client import supabase
from auth import get_current_user, get_current_admin_user

router = APIRouter(tags=["corrections"])


class CorrectionCreate(BaseModel):
    suggested_content: str


class CorrectionResolve(BaseModel):
    action: str


@router.post("/specs/{spec_id}/corrections", status_code=201)
def submit_correction(spec_id: UUID, payload: CorrectionCreate, user=Depends(get_current_user)):
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

    new_status = "approved" if payload.action == "approve" else "rejected"
    now = datetime.utcnow().isoformat()

    supabase.table("spec_corrections").update(
        {"status": new_status, "reviewed_at": now, "reviewed_by": user.id}
    ).eq("id", str(correction_id)).execute()

    if payload.action == "approve":
        supabase.table("spec_documents").update(
            {"content": correction["suggested_content"], "verified_at": now}
        ).eq("id", correction["spec_document_id"]).execute()
        # Spec text changed. The correction row doesn't carry the gadget id, and approvals
        # are rare, so drop every saved AI answer rather than look it up (answer_cache.py).
        answer_cache.invalidate_all()

    return {"id": correction_id, "status": new_status}