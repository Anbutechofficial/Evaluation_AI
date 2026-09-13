from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum
from app.database import Base

class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    COMPLETED = "COMPLETED"

class Exam(Base):
    __tablename__ = "exams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False, index=True)
    class_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    exam_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    duration_minutes = Column(Integer, default=60)
    total_questions = Column(Integer, default=10)
    total_marks = Column(Float, default=20.0)
    status = Column(String, default=ExamStatus.DRAFT.value)
    
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = relationship("User", back_populates="exams")
    question_paper = relationship("QuestionPaper", back_populates="exam", uselist=False, cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan", order_by="Question.question_number")
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")

class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False, unique=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    extracted_text = Column(Text, nullable=True)
    is_ocr = Column(Boolean, default=False)
    processed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    exam = relationship("Exam", back_populates="question_paper")
