from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models.evaluation import Evaluation, TeacherReview
from app.models.submission import Submission, SubmissionStatus
from app.models.question import Question
from app.models.user import User
from app.schemas.evaluation import EvaluationResponse, TeacherReviewCreate, TeacherReviewResponse
from app.schemas.submission import SubmissionResponse
from app.utils.security import require_staff
from app.graph.workflow import evaluation_workflow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evaluations", tags=["Evaluations & HITL Review"])

@router.get("/{submission_id}", response_model=List[EvaluationResponse])
def get_evaluations_for_submission(submission_id: str, db: Session = Depends(get_db)):
    evals = db.query(Evaluation).filter(Evaluation.submission_id == submission_id).all()
    results = []
    for ev in evals:
        resp = EvaluationResponse.model_validate(ev)
        q = db.query(Question).filter(Question.id == ev.question_id).first()
        if q:
            resp.question_number = q.question_number
            resp.question_text = q.question_text
            resp.topic = q.topic
        
        ans = db.query(StudentAnswer).filter(
            StudentAnswer.submission_id == submission_id,
            StudentAnswer.question_id == ev.question_id
        ).first()
        if ans:
            resp.student_answer_text = ans.extracted_answer_text

        results.append(resp)
    return results

@router.post("/run/{submission_id}", response_model=SubmissionResponse)
async def rerun_evaluation(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Triggers complete re-evaluation of submission via LangGraph."""
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    res = await evaluation_workflow.run_evaluation(
        exam_id=sub.exam_id,
        submission_id=submission_id,
        db=db
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Evaluation failed."))

    db.refresh(sub)
    resp = SubmissionResponse.model_validate(sub)
    return resp

@router.put("/{evaluation_id}/teacher-review", response_model=EvaluationResponse)
def submit_teacher_review_override(
    evaluation_id: str,
    payload: TeacherReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """
    Human-in-the-Loop mark override and teacher commentary.
    Stores both the original AI mark and revised teacher mark for total auditability.
    """
    eval_rec = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not eval_rec:
        raise HTTPException(status_code=404, detail="Evaluation record not found.")

    # Clamp revised mark
    clamped_mark = max(0.0, min(payload.revised_mark, eval_rec.max_marks))

    # Check existing teacher review
    t_review = db.query(TeacherReview).filter(TeacherReview.evaluation_id == evaluation_id).first()
    if t_review:
        t_review.revised_mark = clamped_mark
        t_review.teacher_comment = payload.teacher_comment
        t_review.teacher_id = current_user.id
        t_review.reviewed_at = datetime.utcnow()
    else:
        t_review = TeacherReview(
            evaluation_id=evaluation_id,
            teacher_id=current_user.id,
            original_mark=eval_rec.marks_obtained,
            revised_mark=clamped_mark,
            teacher_comment=payload.teacher_comment
        )
        db.add(t_review)

    eval_rec.final_mark = clamped_mark
    eval_rec.is_overridden = True
    eval_rec.needs_manual_review = False

    db.commit()
    db.refresh(eval_rec)

    # Recalculate submission total score
    submission = db.query(Submission).filter(Submission.id == eval_rec.submission_id).first()
    if submission:
        all_evals = db.query(Evaluation).filter(Evaluation.submission_id == submission.id).all()
        new_total = sum(e.final_mark if e.final_mark is not None else e.marks_obtained for e in all_evals)
        submission.total_score = round(new_total, 2)
        submission.percentage = round((submission.total_score / submission.max_score) * 100, 2)
        
        # Check if all items are resolved
        any_pending = any(e.needs_manual_review for e in all_evals)
        if not any_pending and submission.status == SubmissionStatus.MANUAL_REVIEW.value:
            submission.status = SubmissionStatus.EVALUATED.value

        db.commit()

    resp = EvaluationResponse.model_validate(eval_rec)
    return resp

@router.put("/submission/{submission_id}/finalize", response_model=SubmissionResponse)
def finalize_submission_marks(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """
    Finalizes marks for a student submission after staff review.
    """
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    sub.status = SubmissionStatus.FINALIZED.value
    sub.finalized_at = datetime.utcnow()
    
    # Mark all evaluations as reviewed
    evals = db.query(Evaluation).filter(Evaluation.submission_id == submission_id).all()
    for e in evals:
        e.needs_manual_review = False
        if e.final_mark is None:
            e.final_mark = e.marks_obtained

    db.commit()
    db.refresh(sub)
    return SubmissionResponse.model_validate(sub)
