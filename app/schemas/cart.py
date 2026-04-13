from pydantic import BaseModel
from datetime import datetime


class CartCreate(BaseModel):
    resource_id: str


class CartOut(BaseModel):
    id: str
    user_id: str
    resource_id: str
    created_at: datetime

    class Config:
        from_attributes = True
