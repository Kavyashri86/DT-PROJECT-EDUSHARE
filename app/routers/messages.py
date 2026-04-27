from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.message import Message
from app.models.request import Request
from app.models.resource import Resource
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])


def _check_access(req: Request, current_user: User, db: Session):
    """Only the requester or resource owner can access messages."""
    resource = db.query(Resource).filter(Resource.id == req.resource_id).first()
    if req.requester_id != current_user.id and resource.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if req.status not in ("approved", "delivered"):
        raise HTTPException(status_code=400, detail="Chat only available for approved or delivered requests")


@router.post("", response_model=MessageOut, status_code=201)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Request).filter(Request.id == payload.request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    _check_access(req, current_user, db)

    msg = Message(
        request_id=payload.request_id,
        sender_id=current_user.id,
        message=payload.message.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=msg.id,
        request_id=msg.request_id,
        sender_id=msg.sender_id,
        sender_name=current_user.name,
        message=msg.message,
        created_at=msg.created_at,
    )


@router.get("/{request_id}", response_model=List[MessageOut])
def get_messages(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    _check_access(req, current_user, db)

    msgs = db.query(Message).filter(Message.request_id == request_id)\
             .order_by(Message.created_at).all()

    result = []
    for m in msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append(MessageOut(
            id=m.id,
            request_id=m.request_id,
            sender_id=m.sender_id,
            sender_name=sender.name if sender else "Unknown",
            message=m.message,
            created_at=m.created_at,
        ))
    return result
