from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class QuestionAnalytics(BaseModel):
    question_number: int
    question_text: str
    topic: str
    max_marks: float
    average_score: float
    percentage_score: float
    evaluation_count: int
    common_missing_points: List[str]

class TopicWeakness(BaseModel):
    topic: str
    average_percentage: float
    student_count_struggling: int
    recommendation: str

class ScoreDistributionBucket(BaseModel):
    range_label: str # e.g. "90-100%", "80-89%", etc.
    count: int

class DashboardAnalytics(BaseModel):
    total_students: int
    submitted_count: int
    evaluated_count: int
    pending_review_count: int
    finalized_count: int
    
    average_score: float
    highest_score: float
    lowest_score: float
    pass_percentage: float
    
    score_distribution: List[ScoreDistributionBucket]
    question_performance: List[QuestionAnalytics]
    weak_topics: List[TopicWeakness]
    confidence_distribution: Dict[str, int] # High, Medium, Low
