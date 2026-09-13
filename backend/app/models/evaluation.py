from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    # AI Evaluation results
    marks_obtained = Column(Float, nullable=False, default=0.0)
    max_marks = Column(Float, nullable=False, default=2.0)
    confidence = Column(Float, nullable=False, default=0.90)
    reason = Column(Text, nullable=False)
    feedback = Column(Text, nullable=False)
    missing_points = Column(JSON, default=list) # List of missing criteria strings
    needs_manual_review = Column(Boolean, default=False)
    
    # Final Marks (Teacher can override)
    final_mark = Column(Float, nullable=True)
    is_overridden = Column(Boolean, default=False)
    
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    submission = relationship("Submission", back_populates="evaluations")
    question = relationship("Question", back_populates="evaluations")
    teacher_review = relationship("TeacherReview", back_populates="evaluation", uselist=False, cascade="all, delete-orphan")

class TeacherReview(Base):
    __tablename__ = "teacher_reviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    evaluation_id = Column(String, ForeignKey("evaluations.id"), nullable=False, unique=True)
    teacher_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    original_mark = Column(Float, nullable=False)
    revised_mark = Column(Float, nullable=False)
    teacher_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    evaluation = relationship("Evaluation", back_populates="teacher_review")
    teacher = relationship("User", back_populates="reviews")
