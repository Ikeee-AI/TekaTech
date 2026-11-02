"""Admin-only TechSpecs search and import. Disabled unless settings.techspecs_enabled is true.

TechSpecs forbids downloading or caching its data without written authorization, which the
project does not have yet. Until it does, every route here answers 503 after the admin check
and before any outbound call (require_techspecs_enabled).

Import never creates a gadget: it adds one TechSpecs product's specs to an existing gadget as a
saved spec through routers.specs.save_spec_text, the same path as POST /gadgets/{id}/specs
(chunked, stored pending with NULL embeddings, no OpenAI call). Indexing stays a separate step.
The saved text is spec text like any other, so it is untrusted grounding data for /query.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, ValidationError

import techspecs
from auth import get_current_admin_user
from config import settings
from rate_limit import limiter
from routers.specs import SpecIngestRequest, gadget_exists, save_spec_text

router = APIRouter(prefix="/techspecs", tags=["techspecs"])

DISABLED_DETAIL = (
    "TechSpecs import is disabled pending written authorization from TechSpecs. "
    "Add specs by hand instead."
)
SOURCE_URL = "https://techspecs.io/"

ERRORS = {
    "not_configured": (503, "TechSpecs import is enabled but its credentials are not set."),
    "auth": (502, "TechSpecs rejected the request. Check the configured TechSpecs credentials."),
    "not_found": (404, "TechSpecs product not found."),
    "rate_limited": (503, "TechSpecs request limit reached. Try again later."),
    "timeout": (503, "TechSpecs took too long to answer. Try again later."),
    "unavailable": (503, "TechSpecs is unavailable right now. Try again later."),
    "bad_response": (502, "TechSpecs returned a response we couldn't use."),
}


def require_techspecs_enabled() -> None:
    if not settings.techspecs_enabled:
        raise HTTPException(status_code=503, detail=DISABLED_DETAIL)


def _provider_error(exc: techspecs.TechSpecsError) -> HTTPException:
    status, detail = ERRORS.get(exc.kind, ERRORS["unavailable"])
    return HTTPException(status_code=status, detail=detail)


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


class TechSpecsImportRequest(BaseModel):
    gadget_id: UUID
    product_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")


@router.get("/search")
@limiter.limit("30/hour")
def search_products(
    request: Request,
    user=Depends(get_current_admin_user),
    _enabled: None = Depends(require_techspecs_enabled),
    query: str = Query(min_length=2, max_length=100),
    page: int = Query(default=0, ge=0, le=50),
    size: int = Query(default=10, ge=1, le=20),
):
    """Preview only: nothing is stored or cached."""
    query = query.strip()
    if len(query) < 2:
        raise HTTPException(status_code=422, detail="Search for at least 2 characters.")
    try:
        results = techspecs.search(query, page=page, size=size)
    except techspecs.TechSpecsError as exc:
        raise _provider_error(exc) from None
    return {"query": query, "page": page, "size": size, "results": results}


@router.post("/import", status_code=201)
@limiter.limit("20/hour")
def import_product(
    request: Request,
    payload: TechSpecsImportRequest,
    user=Depends(get_current_admin_user),
    _enabled: None = Depends(require_techspecs_enabled),
):
    if not gadget_exists(payload.gadget_id):
        raise HTTPException(status_code=404, detail="Gadget not found")
    try:
        product = techspecs.get_product(payload.product_id)
    except techspecs.TechSpecsError as exc:
        raise _provider_error(exc) from None

    attribution = (
        f"Source: TechSpecs (techspecs.io), product {payload.product_id}, retrieved {_today()} (UTC)"
    )
    raw_text = "\n".join([attribution, f"Product: {product['name']}", *product["lines"]])
    try:
        spec = SpecIngestRequest(raw_text=raw_text, source_url=SOURCE_URL)
    except ValidationError:
        raise HTTPException(
            status_code=422,
            detail="This TechSpecs product has more spec text than one saved spec allows.",
        ) from None
    saved = save_spec_text(payload.gadget_id, spec)
    return {**saved, "product_id": payload.product_id, "source": "TechSpecs", "source_url": SOURCE_URL}
