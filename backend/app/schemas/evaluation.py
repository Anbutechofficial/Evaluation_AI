from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class TeacherReviewCreate(BaseModel):
    revised_mark: float = Field(..., ge=0.0)
    teacher_comment: Optional[str] = None

class TeacherReviewResponse(BaseModel):
    id: str
    evaluation_id: str
    teacher_id: Optional[str] = None
    original_mark: float
    revised_mark: float
    teacher_comment: Optional[str] = None
    reviewed_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EvaluationResponse(BaseModel):
    id: str
    submission_id: str
    question_id: str
    question_number: Optional[int] = None
    question_text: Optional[str] = None
    student_answer_text: Optional[str] = None
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    model_alignment_score: Optional[float] = None
    topic: Optional[str] = None
    
    marks_obtained: float
    max_marks: float
    confidence: float
    reason: str
    feedback: str
    missing_points: List[str] = []
    needs_manual_review: bool
    
    final_mark: Optional[float] = None
    is_overridden: bool = False
    
    teacher_review: Optional[TeacherReviewResponse] = None
    evaluated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EvaluationRunRequest(BaseModel):
    submission_id: str
