from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.evaluation import EvaluationResponse

class StudentAnswerResponse(BaseModel):
    id: str
    question_id: str
    question_number: Optional[int] = None
    extracted_answer_text: str
    confidence_score: float
    model_config = ConfigDict(from_attributes=True)

class SubmissionCreate(BaseModel):
    exam_id: str
    student_name: str
    register_number: str
    class_name: str
    department: str

class SubmissionResponse(BaseModel):
    id: str
    exam_id: str
    exam_name: Optional[str] = None
    subject: Optional[str] = None
    student_name: str
    register_number: str
    class_name: str
    department: str
    file_name: str
    
    total_score: float
    max_score: float
    percentage: float
    rank: Optional[int] = None
    status: str
    
    submitted_at: datetime
    evaluated_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None
    
    student_answers: Optional[List[StudentAnswerResponse]] = []
    evaluations: Optional[List[EvaluationResponse]] = []
    model_config = ConfigDict(from_attributes=True)
