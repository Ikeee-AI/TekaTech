from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class GadgetBase(BaseModel):
    name: str
    brand: str
    category: str
    release_date: Optional[date] = None
    price_php: Optional[float] = None
    image_url: Optional[str] = None

class GadgetCreate(GadgetBase):
    pass

class GadgetUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    release_date: Optional[date] = None
    price_php: Optional[float] = None
    image_url: Optional[str] = None

class GadgetResponse(GadgetBase):
    id: UUID
    created_at: datetime
    updated_at: datetime