from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.question import QuestionResponse

class ExamBase(BaseModel):
    name: str
    subject: str
    class_name: str
    department: str
    exam_date: Optional[datetime] = None
    duration_minutes: int = 60
    total_questions: int = 10
    total_marks: float = 20.0

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    class_name: Optional[str] = None
    department: Optional[str] = None
    exam_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    total_questions: Optional[int] = None
    total_marks: Optional[float] = None
    status: Optional[str] = None

class QuestionPaperResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    is_ocr: bool
    processed_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ExamResponse(ExamBase):
    id: str
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    question_paper: Optional[QuestionPaperResponse] = None
    questions: Optional[List[QuestionResponse]] = []
    submissions_count: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)
