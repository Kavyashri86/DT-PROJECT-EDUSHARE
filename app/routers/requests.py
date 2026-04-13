from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.request import Request
from app.models.resource import Resource
from app.models.user import User
from app.schemas.request import RequestCreate, RequestStatusUpdate, RequestOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.post("", response_model=RequestOut, status_code=201)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource or not resource.is_available:
        raise HTTPException(status_code=404, detail="Resource not found or unavailable")
    if resource.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request your own resource")

    req = Request(resource_id=payload.resource_id, requester_id=current_user.id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("", response_model=List[RequestOut])
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Request).filter(Request.requester_id == current_user.id).all()


@router.patch("/{request_id}", response_model=RequestOut)
def update_request_status(
    request_id: str,
    payload: RequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.status not in ("pending", "approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status value")

    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Only the resource owner can approve/reject
    resource = db.query(Resource).filter(Resource.id == req.resource_id).first()
    if resource.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    req.status = payload.status
    db.commit()
    db.refresh(req)
    return req
