import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceOut
from app.utils.auth import get_current_user

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

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


@router.post("/with-image", response_model=ResourceOut, status_code=201)
async def create_resource_with_image(
    name: str = Form(...),
    category: str = Form(...),
    subject: str = Form(...),
    condition: str = Form(...),
    type: str = Form(...),
    description: Optional[str] = Form(None),
    price: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_url = None

    if image:
        if image.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP, GIF allowed")
        contents = await image.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Max 5MB")
        ext = image.filename.rsplit(".", 1)[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(contents)
        image_url = f"/uploads/{filename}"

    resource = Resource(
        user_id=current_user.id,
        name=name,
        category=category,
        subject=subject,
        condition=condition,
        type=type,
        description=description,
        image_url=image_url,
        price=price,
    )
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

    # Delete image file if exists
    if resource.image_url:
        filepath = resource.image_url.lstrip("/")
        if os.path.exists(filepath):
            os.remove(filepath)

    db.delete(resource)
    db.commit()
