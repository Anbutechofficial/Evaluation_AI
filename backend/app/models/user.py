from sqlalchemy import Column, String, DateTime, Enum, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    STAFF = "STAFF"
    STUDENT = "STUDENT"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.STAFF.value, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    exams = relationship("Exam", back_populates="creator", cascade="all, delete-orphan")
    reviews = relationship("TeacherReview", back_populates="teacher")
