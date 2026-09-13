from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.models.exam import Exam, ExamStatus
from app.models.submission import Submission, SubmissionStatus, StudentAnswer
from app.models.evaluation import Evaluation
from app.models.question import Question
from app.models.rubric import Rubric
from app.schemas.submission import SubmissionResponse, SubmissionCreate
from app.services.storage_service import storage_service
from app.graph.workflow import evaluation_workflow
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/submissions", tags=["Submissions"])

@router.get("", response_model=List[SubmissionResponse])
def get_all_submissions(
    exam_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Submission)
    if exam_id:
        query = query.filter(Submission.exam_id == exam_id)
    if status_filter:
        query = query.filter(Submission.status == status_filter)

    submissions = query.order_by(Submission.submitted_at.desc()).all()
    
    # Enrich submissions with question details and extracted answers
    results = []
    for s in submissions:
        resp = _enrich_submission_response(s, db)
        results.append(resp)
    return results

def _enrich_submission_response(sub: Submission, db: Session) -> SubmissionResponse:
    resp = SubmissionResponse.model_validate(sub)
    resp.exam_name = sub.exam.name if sub.exam else "Examination"
    resp.subject = sub.exam.subject if sub.exam else "Subject"
    
    for ev in resp.evaluations:
        q = db.query(Question).filter(Question.id == ev.question_id).first()
        if q:
            ev.question_number = q.question_number
            ev.question_text = q.question_text
            ev.topic = q.topic

            rubric = db.query(Rubric).filter(Rubric.question_id == q.id).first()
            if rubric:
                ev.expected_answer = rubric.expected_answer
                ev.model_answer = rubric.model_answer

        # Find matching student answer text
        ans = db.query(StudentAnswer).filter(
            StudentAnswer.submission_id == sub.id,
            StudentAnswer.question_id == ev.question_id
        ).first()
        if ans:
            ev.student_answer_text = ans.extracted_answer_text

        # Compute benchmark model answer alignment score if not already set
        if ev.model_alignment_score is None:
            if ev.max_marks > 0:
                calc_score = round((ev.marks_obtained / ev.max_marks) * 100, 1)
            else:
                calc_score = 0.0
            # If model answer is present, factor in text similarity
            if ev.model_answer and ev.student_answer_text:
                import difflib
                ratio = difflib.SequenceMatcher(None, ev.student_answer_text.lower(), ev.model_answer.lower()).ratio() * 100
                calc_score = round(max(calc_score, ratio), 1)
            ev.model_alignment_score = min(100.0, max(0.0, calc_score))

    return resp

@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission_by_id(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
    return _enrich_submission_response(sub, db)

@router.post("", response_model=SubmissionResponse)
async def submit_answer_sheet(
    exam_id: str = Form(...),
    student_name: str = Form(...),
    register_number: str = Form(...),
    class_name: str = Form(...),
    department: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Student submits answer sheet PDF.
    Validates file, creates submission, and executes the LangGraph agentic RAG evaluation pipeline.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF answer sheets are accepted.")

    # Save PDF
    saved = storage_service.save_file(file, subfolder="answer_sheets")

    # Create Submission
    submission = Submission(
        exam_id=exam_id,
        student_name=student_name.strip(),
        register_number=register_number.strip().upper(),
        class_name=class_name.strip(),
        department=department.strip(),
        file_name=saved["filename"],
        file_path=saved["path"],
        total_score=0.0,
        max_score=exam.total_marks,
        percentage=0.0,
        status=SubmissionStatus.PROCESSING.value
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Run LangGraph Agentic RAG Evaluation Workflow
    logger.info(f"Starting LangGraph Evaluation for student {student_name} ({register_number})...")
    eval_run = await evaluation_workflow.run_evaluation(
        exam_id=exam_id,
        submission_id=submission.id,
        db=db
    )

    db.refresh(submission)
    
    # Recalculate ranks across exam
    _recalculate_exam_ranks(exam_id, db)

    return _enrich_submission_response(submission, db)

def _recalculate_exam_ranks(exam_id: str, db: Session):
    all_subs = db.query(Submission).filter(
        Submission.exam_id == exam_id,
        Submission.status.in_([SubmissionStatus.EVALUATED.value, SubmissionStatus.FINALIZED.value, SubmissionStatus.MANUAL_REVIEW.value])
    ).order_by(Submission.total_score.desc()).all()

    for idx, s in enumerate(all_subs, 1):
        s.rank = idx
    db.commit()
