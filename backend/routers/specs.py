from typing import Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

import answer_cache
import cache
from auth import get_current_admin_user, get_current_user
from embeddings import chunk_text, embed_texts
from rate_limit import limiter
from supabase_client import supabase
from tokens import count_embedding_tokens

router = APIRouter(prefix="/gadgets/{gadget_id}/specs", tags=["specs"])

# Characters are a free first-pass guard; tokens are what OpenAI actually bills
# for the embedding call. Measured on real spec text the ratio swings ~3x by
# language (roughly 1.5-4.3 chars/token), so the char cap alone would let one
# request cost several times another of identical length.
MAX_RAW_TEXT_LENGTH = 20_000
MAX_RAW_TEXT_TOKENS = 6_000


class SpecIngestRequest(BaseModel):
    raw_text: str = Field(min_length=1, max_length=MAX_RAW_TEXT_LENGTH)
    source_url: Optional[str] = None

    @field_validator("raw_text")
    @classmethod
    def raw_text_within_token_budget(cls, value: str) -> str:
        tokens = count_embedding_tokens(value)
        if tokens > MAX_RAW_TEXT_TOKENS:
            raise ValueError(
                f"Spec text is {tokens} tokens; the limit is {MAX_RAW_TEXT_TOKENS}. "
                "Split it into smaller submissions."
            )
        return value


class SpecDocumentResponse(BaseModel):
    id: UUID
    gadget_id: UUID
    content: str
    source_url: Optional[str] = None
    chunk_index: int
    verified_at: datetime
    indexing_status: str = "pending"


@router.post("", status_code=201)
@limiter.limit("20/hour")
def ingest_spec_text(request: Request, gadget_id: UUID, payload: SpecIngestRequest, user=Depends(get_current_user)):
    exists = supabase.table("gadgets").select("id").eq("id", str(gadget_id)).execute()
    if not exists.data:
        raise HTTPException(status_code=404, detail="Gadget not found")

    chunks = chunk_text(payload.raw_text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No usable text found to chunk")

    rows = [
        {
            "gadget_id": str(gadget_id),
            "content": chunk,
            "embedding": None,
            "indexing_status": "pending",
            "source_url": payload.source_url,
            "chunk_index": i,
        }
        for i, chunk in enumerate(chunks)
    ]

    result = supabase.table("spec_documents").insert(rows).execute()
    # Spec coverage counts gadgets that have spec rows.
    cache.invalidate("stats")
    # Saved AI answers that searched this gadget's specs (see answer_cache.py).
    answer_cache.invalidate_gadget(gadget_id)
    return {"gadget_id": gadget_id, "chunks_created": len(result.data), "indexing_status": "pending"}


@router.get("", response_model=list[SpecDocumentResponse])
def list_specs(gadget_id: UUID):
    result = (
        supabase.table("spec_documents")
        .select("id, gadget_id, content, source_url, chunk_index, verified_at, indexing_status")
        .eq("gadget_id", str(gadget_id))
        .order("chunk_index")
        .execute()
    )
    return result.data


@router.post("/{spec_id}/index")
@limiter.limit("20/hour")
def index_spec(request: Request, gadget_id: UUID, spec_id: UUID, user=Depends(get_current_user)):
    """Index an existing chunk; failures leave the saved text pending."""
    result = (supabase.table("spec_documents").select("id, content, indexing_status")
              .eq("id", str(spec_id)).eq("gadget_id", str(gadget_id)).execute())
    if not result.data:
        raise HTTPException(status_code=404, detail="Spec not found")
    spec = result.data[0]
    if spec["indexing_status"] == "indexed":
        return {"id": spec_id, "indexing_status": "indexed"}
    if count_embedding_tokens(spec["content"]) > MAX_RAW_TEXT_TOKENS:
        raise HTTPException(status_code=422, detail="Spec exceeds the indexing token limit")
    try:
        vectors = embed_texts([spec["content"]])
        if len(vectors) != 1 or not vectors[0]:
            raise ValueError("Invalid embedding response")
    except Exception:
        raise HTTPException(status_code=503, detail="AI indexing is unavailable. Your specs are saved; try again later.") from None
    # Do not attach an embedding to text that changed while OpenAI was running.
    updated = (supabase.table("spec_documents")
               .update({"embedding": vectors[0], "indexing_status": "indexed"})
               .eq("id", str(spec_id)).eq("gadget_id", str(gadget_id))
               .eq("content", spec["content"]).execute())
    if not updated.data:
        raise HTTPException(status_code=409, detail="Spec changed during indexing. Please retry.")
    # The chunk is now retrievable, so answers about this gadget may change.
    answer_cache.invalidate_gadget(gadget_id)
    return {"id": spec_id, "indexing_status": "indexed"}


@router.delete("/{spec_id}", status_code=204)
def delete_spec(gadget_id: UUID, spec_id: UUID, user=Depends(get_current_admin_user)):
    """Admin-only, like gadget delete (#125). Removes one spec card: its text and its
    embedding live in the same `spec_documents` row, and pending corrections on it go
    too (`on delete cascade`). Scoped to the gadget in the URL, so a mismatched pair
    is a 404 rather than deleting another gadget's spec."""
    result = (supabase.table("spec_documents").delete()
              .eq("id", str(spec_id)).eq("gadget_id", str(gadget_id)).execute())
    if not result.data:
        raise HTTPException(status_code=404, detail="Spec not found")
    cache.invalidate("stats")
    # Saved AI answers may cite the deleted chunk.
    answer_cache.invalidate_gadget(gadget_id)
