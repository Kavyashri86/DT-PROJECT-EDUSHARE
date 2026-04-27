from pydantic import BaseModel
from datetime import datetime


class MessageCreate(BaseModel):
    request_id: str
    message: str


class MessageOut(BaseModel):
    id: str
    request_id: str
    sender_id: str
    sender_name: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
