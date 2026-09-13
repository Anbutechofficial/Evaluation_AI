from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum
from app.database import Base

class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    PROCESSING = "PROCESSING"
    EVALUATED = "EVALUATED"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    FINALIZED = "FINALIZED"

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    student_name = Column(String, nullable=False, index=True)
    register_number = Column(String, nullable=False, index=True)
    class_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    
    total_score = Column(Float, default=0.0)
    max_score = Column(Float, default=20.0)
    percentage = Column(Float, default=0.0)
    rank = Column(Integer, nullable=True)
    
    status = Column(String, default=SubmissionStatus.SUBMITTED.value, index=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    evaluated_at = Column(DateTime, nullable=True)
    finalized_at = Column(DateTime, nullable=True)

    # Relationships
    exam = relationship("Exam", back_populates="submissions")
    student_answers = relationship("StudentAnswer", back_populates="submission", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="submission", cascade="all, delete-orphan")

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    extracted_answer_text = Column(Text, nullable=False)
    confidence_score = Column(Float, default=1.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    submission = relationship("Submission", back_populates="student_answers")
    question = relationship("Question", back_populates="student_answers")
