from datetime import date, datetime
from typing import Annotated, Optional
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError


def normalize_category(value: Optional[str]) -> Optional[str]:
    """One spelling per category (#78): trim, collapse inner spaces, capitalise
    the first letter. The rest stays as typed so "VR headset" keeps its "VR".
    Never raises, because it also cleans older rows on the way out."""
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned[:1].upper() + cleaned[1:]


# --- Input limits -----------------------------------------------------------
# The backend is the real gate: the form in frontend/src/utils/gadgetValidation.js
# shows the same rules early, but any API caller can skip it. Keep the numbers
# and messages in step with that file. Messages are PydanticCustomError, not
# ValueError, so the 422 `msg` the frontend shows has no "Value error, " prefix
# (same approach as QueryRequest in routers/query.py).
MAX_NAME_CHARS = 120
MAX_BRAND_CHARS = 80
MAX_CATEGORY_CHARS = 60
MAX_PRICE_PHP = 10_000_000  # the form's limit; numeric(12, 2) itself holds up to ~1e10
MIN_RELEASE_YEAR = 1970
MAX_RELEASE_YEAR = 2100
MAX_URL_CHARS = 2000

# allow_inf_nan=False: Python's JSON parser accepts NaN and Infinity, which no price should be.
PricePhp = Annotated[float, Field(ge=0, le=MAX_PRICE_PHP, allow_inf_nan=False)]

URL_ERROR = "Enter a full link starting with http:// or https://."

# field -> (message when blank, label used in the too-long message, max characters)
_TEXT_RULES = {
    "name": ("Enter the gadget name.", "name", MAX_NAME_CHARS),
    "brand": ("Enter the brand.", "brand", MAX_BRAND_CHARS),
    "category": ("Enter a category, like Smartphone or Laptop.", "category", MAX_CATEGORY_CHARS),
}


def _clean_required_text(value: str, info) -> str:
    """Strip, then require 1..max characters (blank-only text counts as empty)."""
    blank_message, label, max_chars = _TEXT_RULES[info.field_name]
    value = value.strip()
    if not value:
        raise PydanticCustomError("text_empty", blank_message)
    if len(value) > max_chars:
        raise PydanticCustomError(
            "text_too_long",
            "Keep the {label} under {limit} characters.",
            {"label": label, "limit": max_chars},
        )
    return value


def clean_http_url(value: Optional[str]) -> Optional[str]:
    """Optional http(s) link: stripped, blank -> None, anything else must be a full
    http:// or https:// URL. Other schemes (javascript:, data:, file:) are refused
    because these links are rendered as clickable hrefs in the UI."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if len(value) > MAX_URL_CHARS:
        raise PydanticCustomError(
            "url_too_long", "Keep the link under {limit} characters.", {"limit": MAX_URL_CHARS}
        )
    if any(ch.isspace() or ord(ch) < 32 for ch in value):
        raise PydanticCustomError("url_invalid", URL_ERROR)
    try:
        parts = urlsplit(value)
    except ValueError:
        raise PydanticCustomError("url_invalid", URL_ERROR) from None
    if parts.scheme.lower() not in ("http", "https") or not parts.netloc:
        raise PydanticCustomError("url_invalid", URL_ERROR)
    return value


def check_release_date(value: Optional[date]) -> Optional[date]:
    if value is not None and not (MIN_RELEASE_YEAR <= value.year <= MAX_RELEASE_YEAR):
        raise PydanticCustomError(
            "release_date_out_of_range",
            "Enter a real date (year {low}-{high}).",
            {"low": MIN_RELEASE_YEAR, "high": MAX_RELEASE_YEAR},
        )
    return value


class GadgetBase(BaseModel):
    """Response shape. Deliberately lenient: rows saved before the input limits
    existed must still be readable, so the limits live on the input models only."""

    name: str
    brand: str
    category: str
    release_date: Optional[date] = None
    price_php: Optional[float] = None
    image_url: Optional[str] = None

    # Runs on create and on every response, so rows saved before #78
    # ("smartphone") are shown as "Smartphone" too.
    _normalize_category = field_validator("category")(normalize_category)


class GadgetCreate(BaseModel):
    name: str
    brand: str
    category: str
    release_date: Optional[date] = None
    price_php: Optional[PricePhp] = None
    image_url: Optional[str] = None

    # Declaration order matters: the length check runs before category normalization.
    _clean_text = field_validator("name", "brand", "category")(_clean_required_text)
    _normalize_category = field_validator("category")(normalize_category)
    _check_release_date = field_validator("release_date")(check_release_date)
    _clean_image_url = field_validator("image_url")(clean_http_url)


class GadgetUpdate(BaseModel):
    """PATCH body. Only the fields the client sends are written (the router dumps
    with exclude_unset): an omitted field stays as it is, and an explicit null
    clears release_date, price_php or image_url. name, brand and category are
    required columns, so null is refused for them."""

    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    release_date: Optional[date] = None
    price_php: Optional[PricePhp] = None
    image_url: Optional[str] = None

    @field_validator("name", "brand", "category", mode="before")
    @classmethod
    def required_fields_not_null(cls, value, info):
        # Validators don't run for omitted fields, so this only fires on an explicit null.
        if value is None:
            raise PydanticCustomError("text_empty", _TEXT_RULES[info.field_name][0])
        return value

    _clean_text = field_validator("name", "brand", "category")(_clean_required_text)
    _normalize_category = field_validator("category")(normalize_category)
    _check_release_date = field_validator("release_date")(check_release_date)
    _clean_image_url = field_validator("image_url")(clean_http_url)


class GadgetResponse(GadgetBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
