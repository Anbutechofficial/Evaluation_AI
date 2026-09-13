from typing import TypedDict, List, Dict, Any, Optional

class QuestionEvaluationItem(TypedDict):
    question_id: str
    question_number: int
    question_text: str
    topic: str
    max_marks: float
    student_answer: str
    rubric_criteria: List[Dict[str, Any]]
    expected_answer: str
    retrieved_context: str
    marks_obtained: float
    confidence: float
    reason: str
    feedback: str
    missing_points: List[str]
    needs_manual_review: bool

class LangGraphEvaluationState(TypedDict):
    exam_id: str
    submission_id: str
    student_name: str
    register_number: str
    file_path: str
    raw_extracted_text: str
    is_ocr_applied: bool
    structured_answers: Optional[List[Dict[str, Any]]]
    
    # Question & Answer mappings
    extracted_qa_pairs: List[Dict[str, Any]]
    
    # Per-question evaluation items
    evaluations: List[QuestionEvaluationItem]
    
    # Aggregated results
    total_score: float
    max_score: float
    percentage: float
    has_manual_review_flags: bool
    status: str
    error: Optional[str]
