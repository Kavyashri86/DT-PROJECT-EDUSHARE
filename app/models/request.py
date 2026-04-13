import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Request(Base):
    __tablename__ = "requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id = Column(String(36), ForeignKey("resources.id"), nullable=False)
    requester_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending / approved / rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    resource = relationship("Resource", back_populates="requests")
    requester = relationship("User", back_populates="requests")
