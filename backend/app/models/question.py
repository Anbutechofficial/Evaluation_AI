from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    max_marks = Column(Float, default=2.0, nullable=False)
    topic = Column(String, nullable=True, default="General")
    keywords = Column(JSON, default=list)  # List of string keywords
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    rubric = relationship("Rubric", back_populates="question", uselist=False, cascade="all, delete-orphan")
    student_answers = relationship("StudentAnswer", back_populates="question", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="question", cascade="all, delete-orphan")
