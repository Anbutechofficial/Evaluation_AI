from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String, ForeignKey("questions.id"), nullable=False, unique=True)
    # criteria is a JSON list of objects: [{"criterion": "Explains simulation...", "marks": 1.0}, ...]
    criteria = Column(JSON, default=list, nullable=False)
    expected_answer = Column(Text, nullable=True)
    model_answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    question = relationship("Question", back_populates="rubric")
