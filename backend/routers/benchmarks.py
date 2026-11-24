"""Game and chip benchmarks per gadget (S5-IK, 24 Nov 2026; table in sql/gadget_benchmarks.sql).

Every row is a published result with its source link. TekaTech does not run benchmarks; an
admin enters what a review or benchmark site published, the same way specs are curated.
Reading is public like spec text (catalog data); writing is admin-only. The AI sees a scoped
gadget's benchmarks as extra numbered snippets (routers/query.py), so each write invalidates
that gadget's saved answers.
"""
from datetime import date
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

import answer_cache
from auth import get_current_admin_user
from rate_limit import limiter
from schemas import clean_http_url
from supabase_client import supabase

router = APIRouter(prefix="/gadgets/{gadget_id}/benchmarks", tags=["benchmarks"])

MAX_TEST_CHARS = 80
MAX_SETTINGS_CHARS = 80
MAX_UNIT_CHARS = 20
MAX_VALUE = 100_000_000
# A phone page lists every row; a gadget with more than this is a data-entry mistake.
MAX_BENCHMARKS_PER_GADGET = 60
COLUMNS = "id, gadget_id, kind, test, settings, value, unit, source_url, checked_at"


def _required_text(value: str, label: str, limit: int) -> str:
    value = " ".join(value.split())
    if not value:
        raise PydanticCustomError("text_empty", "Enter the {label}.", {"label": label})
    if len(value) > limit:
        raise PydanticCustomError(
            "text_too_long", "Keep the {label} under {limit} characters.", {"label": label, "limit": limit}
        )
    return value


class BenchmarkInput(BaseModel):
    kind: Literal["score", "game"]
    test: str
    settings: Optional[str] = None
    value: float = Field(ge=0, lt=MAX_VALUE, allow_inf_nan=False)
    unit: str
    # Required: a benchmark without a link to where it was published is not shown.
    source_url: str
    checked_at: Optional[date] = None

    @field_validator("test")
    @classmethod
    def _test(cls, value: str) -> str:
        return _required_text(value, "benchmark or game name", MAX_TEST_CHARS)

    @field_validator("unit")
    @classmethod
    def _unit(cls, value: str) -> str:
        return _required_text(value, "unit", MAX_UNIT_CHARS)

    @field_validator("settings")
    @classmethod
    def _settings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = " ".join(value.split())
        if len(value) > MAX_SETTINGS_CHARS:
            raise PydanticCustomError(
                "text_too_long", "Keep the settings under {limit} characters.", {"limit": MAX_SETTINGS_CHARS}
            )
        return value or None

    @field_validator("source_url")
    @classmethod
    def _source(cls, value: str) -> str:
        cleaned = clean_http_url(value)
        if not cleaned:
            raise PydanticCustomError("url_required", "Add the link where this result was published.")
        return cleaned

    @field_validator("checked_at")
    @classmethod
    def _checked(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value > date.today():
            raise PydanticCustomError("date_future", "The checked date can't be in the future.")
        return value

    def row(self) -> dict:
        data = self.model_dump(mode="json", exclude_none=True)
        return data


class BenchmarkResponse(BaseModel):
    id: UUID
    gadget_id: UUID
    kind: Literal["score", "game"]
    test: str
    settings: Optional[str] = None
    value: float
    unit: str
    source_url: str
    checked_at: date


def _gadget_exists(gadget_id: UUID) -> bool:
    return bool(supabase.table("gadgets").select("id").eq("id", str(gadget_id)).execute().data)


def benchmarks_for(gadget_ids: list[str]) -> list[dict]:
    """All benchmark rows for these gadgets, games first, then by test name. Used by the AI too."""
    if not gadget_ids:
        return []
    rows = (
        supabase.table("gadget_benchmarks").select(COLUMNS)
        .in_("gadget_id", gadget_ids).order("kind").order("test").execute().data
    )
    return rows or []


# Deliberately public, like GET /gadgets/{id}/specs: admin-curated catalog data with sources.
@router.get("", response_model=list[BenchmarkResponse])
# No browser Cache-Control: the admin UI re-reads this list right after a save or delete.
def list_benchmarks(gadget_id: UUID):
    return benchmarks_for([str(gadget_id)])


@router.post("", status_code=201, response_model=BenchmarkResponse)
@limiter.limit("60/hour")
def add_benchmark(request: Request, gadget_id: UUID, payload: BenchmarkInput, user=Depends(get_current_admin_user)):
    if not _gadget_exists(gadget_id):
        raise HTTPException(status_code=404, detail="Gadget not found")
    existing = supabase.table("gadget_benchmarks").select("id").eq("gadget_id", str(gadget_id)).execute().data or []
    if len(existing) >= MAX_BENCHMARKS_PER_GADGET:
        raise HTTPException(
            status_code=409, detail=f"This phone already has {MAX_BENCHMARKS_PER_GADGET} benchmarks. Delete one first."
        )
    result = supabase.table("gadget_benchmarks").insert({**payload.row(), "gadget_id": str(gadget_id)}).execute()
    if not result.data:
        raise HTTPException(status_code=503, detail="Couldn't save the benchmark. Please try again.")
    answer_cache.invalidate_gadget(gadget_id)
    return result.data[0]


@router.put("/{benchmark_id}", response_model=BenchmarkResponse)
@limiter.limit("60/hour")
def update_benchmark(
    request: Request, gadget_id: UUID, benchmark_id: UUID, payload: BenchmarkInput, user=Depends(get_current_admin_user)
):
    row = payload.row()
    # A cleared settings field must clear the stored value too.
    row.setdefault("settings", None)
    result = (
        supabase.table("gadget_benchmarks").update(row)
        .eq("id", str(benchmark_id)).eq("gadget_id", str(gadget_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    answer_cache.invalidate_gadget(gadget_id)
    return result.data[0]


@router.delete("/{benchmark_id}", status_code=204)
@limiter.limit("60/hour")
def delete_benchmark(request: Request, gadget_id: UUID, benchmark_id: UUID, user=Depends(get_current_admin_user)):
    result = (
        supabase.table("gadget_benchmarks").delete()
        .eq("id", str(benchmark_id)).eq("gadget_id", str(gadget_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    answer_cache.invalidate_gadget(gadget_id)
    return Response(status_code=204)
