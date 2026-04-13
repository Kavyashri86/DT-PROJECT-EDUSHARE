from pydantic import BaseModel
from datetime import datetime


class RequestCreate(BaseModel):
    resource_id: str


class RequestStatusUpdate(BaseModel):
    status: str  # pending / approved / rejected


class RequestOut(BaseModel):
    id: str
    resource_id: str
    requester_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
