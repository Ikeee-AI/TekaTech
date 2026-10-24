from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
from uuid import UUID


def normalize_category(value: Optional[str]) -> Optional[str]:
    """One spelling per category (#78): trim, collapse inner spaces, capitalise
    the first letter. The rest stays as typed so "VR headset" keeps its "VR".
    Never raises, because it also cleans older rows on the way out."""
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned[:1].upper() + cleaned[1:]


class GadgetBase(BaseModel):
    name: str
    brand: str
    category: str
    release_date: Optional[date] = None
    price_php: Optional[float] = None
    image_url: Optional[str] = None

    # Runs on create and on every response, so rows saved before #78
    # ("smartphone") are shown as "Smartphone" too.
    _normalize_category = field_validator("category")(normalize_category)

class GadgetCreate(GadgetBase):
    pass

class GadgetUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    release_date: Optional[date] = None
    price_php: Optional[float] = None
    image_url: Optional[str] = None

    _normalize_category = field_validator("category")(normalize_category)

class GadgetResponse(GadgetBase):
    id: UUID
    created_at: datetime
    updated_at: datetime