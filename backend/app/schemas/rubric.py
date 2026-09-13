from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class RubricCriterion(BaseModel):
    criterion: str
    marks: float = Field(..., ge=0.0)

class RubricBase(BaseModel):
    criteria: List[RubricCriterion]
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None

class RubricCreate(RubricBase):
    pass

class RubricUpdate(RubricBase):
    pass

class RubricResponse(RubricBase):
    id: str
    question_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
