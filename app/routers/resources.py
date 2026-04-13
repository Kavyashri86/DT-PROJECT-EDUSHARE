from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=List[ResourceOut])
def list_resources(db: Session = Depends(get_db)):
    return db.query(Resource).filter(Resource.is_available == True).all()


@router.post("", response_model=ResourceOut, status_code=201)
def create_resource(
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = Resource(**payload.model_dump(), user_id=current_user.id)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.put("/{resource_id}", response_model=ResourceOut)
def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)

    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/{resource_id}", status_code=204)
def delete_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(resource)
    db.commit()
