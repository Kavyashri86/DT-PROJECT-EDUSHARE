from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResourceCreate(BaseModel):
    name: str
    category: str
    subject: str
    condition: str
    type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[str] = None   # "0" or None = Free, "250" = ₹250


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    condition: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[str] = None
    is_available: Optional[bool] = None


class ResourceOut(BaseModel):
    id: str
    user_id: str
    name: str
    category: str
    subject: str
    condition: str
    type: str
    description: Optional[str]
    image_url: Optional[str]
    price: Optional[str]
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True
