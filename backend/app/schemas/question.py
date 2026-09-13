from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.rubric import RubricResponse, RubricCreate

class QuestionBase(BaseModel):
    question_number: int
    question_text: str
    max_marks: float = Field(default=2.0, ge=0.5)
    topic: Optional[str] = "General"
    keywords: List[str] = []

class QuestionCreate(QuestionBase):
    rubric: Optional[RubricCreate] = None

class QuestionUpdate(BaseModel):
    question_number: Optional[int] = None
    question_text: Optional[str] = None
    max_marks: Optional[float] = None
    topic: Optional[str] = None
    keywords: Optional[List[str]] = None

class QuestionResponse(QuestionBase):
    id: str
    exam_id: str
    rubric: Optional[RubricResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
