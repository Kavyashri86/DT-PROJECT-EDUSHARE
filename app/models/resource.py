import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)   # Book / Device / Calculator / Lab Kit
    subject = Column(String(100), nullable=False)
    condition = Column(String(20), nullable=False)  # New / Good / Used
    type = Column(String(20), nullable=False)        # Donate / Lend / Share
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="resources")
    requests = relationship("Request", back_populates="resource")
    cart_items = relationship("Cart", back_populates="resource")
