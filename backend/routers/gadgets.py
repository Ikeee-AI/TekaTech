import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

import answer_cache
import cache
from image_upload import (
    FORM_FIELD,
    IMAGE_TYPES,
    MAX_IMAGE_BYTES,
    ImageUpload,
    read_image_upload,
)
from rate_limit import limiter
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

# The two GET routes are deliberately public (owner decision, 14 Nov 2026): visitors who are not
# signed in may browse the catalog. Every AI, comparison and question endpoint needs a session
# (routers/query.py, comparisons.py, stats.py trending-questions); writes here are admin-only.
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
    # explicit null clears an optional field such as price_php or store_url (GadgetUpdate
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


# Admin photo upload (#202). Public bucket in Supabase Storage, created by hand in each project
# (sql/manual/gadget_images_bucket.sql, docs/database.md). The backend writes with the
# service-role key, so the bucket needs no write policy and must not get one.
IMAGE_BUCKET = "gadget-images"
# The object name is the file's own hash, so its bytes never change: browsers and the CDN may keep it a year.
IMAGE_CACHE_SECONDS = 31536000
DETAIL_IMAGE_STORE_FAILED = "Couldn't store the photo right now. The gadget was not changed. Try again in a moment."

_IMAGE_UPLOAD_OPENAPI = {
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {
                    "type": "object",
                    "required": [FORM_FIELD],
                    "properties": {
                        FORM_FIELD: {
                            "type": "string",
                            "format": "binary",
                            "description": f"JPEG, PNG, WebP or AVIF, at most {MAX_IMAGE_BYTES // (1024 * 1024)} MB.",
                        }
                    },
                }
            }
        },
    }
}


@router.post("/{gadget_id}/image", response_model=GadgetResponse, openapi_extra=_IMAGE_UPLOAD_OPENAPI)
@limiter.limit("20/hour")
def upload_gadget_image(
    request: Request,
    gadget_id: UUID,
    # Order matters: the admin check runs before the body is read.
    user=Depends(get_current_admin_user),
    image: ImageUpload = Depends(read_image_upload),
):
    """Store one photo for the gadget and point its image_url at it; returns the updated gadget.

    400 upload interrupted, 413 over 2 MB, 415 not a JPEG/PNG/WebP/AVIF (by magic bytes; SVG always refused), 422 no file,
    404 unknown gadget, 503 storage or database failure (the gadget is then left unchanged).
    """
    try:
        found = supabase.table("gadgets").select("id").eq("id", str(gadget_id)).execute()
    except Exception as exc:
        logger.warning("Gadget lookup before image upload failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED) from None
    if not found.data:
        raise HTTPException(status_code=404, detail="Gadget not found")

    path = f"gadgets/{gadget_id}/{image.sha256[:32]}.{image.extension}"
    try:
        bucket = supabase.storage.from_(IMAGE_BUCKET)
        bucket.upload(
            path,
            image.data,
            file_options={
                "content-type": IMAGE_TYPES[image.extension],
                "cache-control": str(IMAGE_CACHE_SECONDS),
                # Same name = same bytes, so uploading the same photo again just succeeds.
                "upsert": "true",
            },
        )
        public_url = bucket.get_public_url(path).rstrip("?")
    except Exception as exc:
        # Type only: storage errors can echo request details.
        logger.warning("Gadget image upload failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail=DETAIL_IMAGE_STORE_FAILED) from None

    try:
        result = supabase.table("gadgets").update({"image_url": public_url}).eq("id", str(gadget_id)).execute()
    except Exception as exc:
        logger.warning("Gadget image_url update failed: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(status_code=503, detail=DETAIL_SAVE_FAILED) from None
    finally:
        # Same invalidation as update_gadget.
        cache.invalidate("gadgets", "stats")
        answer_cache.invalidate_gadget(gadget_id)
    if not result.data:
        raise HTTPException(status_code=404, detail="Gadget not found")
    return result.data[0]