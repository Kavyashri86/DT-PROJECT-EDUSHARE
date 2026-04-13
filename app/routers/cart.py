from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.cart import Cart
from app.models.resource import Resource
from app.models.user import User
from app.schemas.cart import CartCreate, CartOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.post("", response_model=CartOut, status_code=201)
def add_to_cart(
    payload: CartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource or not resource.is_available:
        raise HTTPException(status_code=404, detail="Resource not found or unavailable")

    existing = db.query(Cart).filter(
        Cart.user_id == current_user.id,
        Cart.resource_id == payload.resource_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in cart")

    item = Cart(user_id=current_user.id, resource_id=payload.resource_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=List[CartOut])
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Cart).filter(Cart.user_id == current_user.id).all()


@router.delete("/{cart_id}", status_code=204)
def remove_from_cart(
    cart_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Cart).filter(Cart.id == cart_id, Cart.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
