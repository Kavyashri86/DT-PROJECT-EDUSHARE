from pydantic import BaseModel, EmailStr
from datetime import datetime


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    student_id: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    student_id: str
    created_at: datetime

    class Config:
        from_attributes = True
