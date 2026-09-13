from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.exam import Exam
from app.models.question import Question
from app.models.rubric import Rubric
from app.models.user import User
from app.schemas.question import QuestionResponse, QuestionUpdate, QuestionCreate
from app.schemas.rubric import RubricUpdate, RubricResponse
from app.utils.security import require_staff
from app.rag.ingestion import rag_ingestion

router = APIRouter(prefix="/questions", tags=["Questions & Rubrics"])

@router.get("/exam/{exam_id}", response_model=List[QuestionResponse])
def get_exam_questions(exam_id: str, db: Session = Depends(get_db)):
    questions = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.question_number).all()
    return questions

@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: str,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(question, field, val)

    db.commit()
    db.refresh(question)
    
    # Re-sync RAG knowledge
    _resync_rag(question.exam_id, db)
    return question

@router.put("/{question_id}/rubric", response_model=RubricResponse)
def update_question_rubric(
    question_id: str,
    payload: RubricUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    rubric = db.query(Rubric).filter(Rubric.question_id == question_id).first()
    if not rubric:
        rubric = Rubric(question_id=question_id)
        db.add(rubric)

    rubric.criteria = [c.model_dump() for c in payload.criteria]
    if payload.expected_answer is not None:
        rubric.expected_answer = payload.expected_answer
    if payload.model_answer is not None:
        rubric.model_answer = payload.model_answer

    db.commit()
    db.refresh(rubric)

    # Re-sync RAG knowledge
    question = db.query(Question).filter(Question.id == question_id).first()
    if question:
        _resync_rag(question.exam_id, db)

    return rubric

@router.delete("/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    exam_id = question.exam_id
    db.delete(question)
    db.commit()

    _resync_rag(exam_id, db)
    return {"message": "Question deleted successfully."}

def _resync_rag(exam_id: str, db: Session):
    """Refreshes the Vector Store index for the exam."""
    questions = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.question_number).all()
    q_data = []
    for q in questions:
        rubric = db.query(Rubric).filter(Rubric.question_id == q.id).first()
        rubric_dict = {
            "criteria": rubric.criteria if rubric else [],
            "expected_answer": rubric.expected_answer if rubric else "",
            "model_answer": rubric.model_answer if rubric else ""
        }
        q_data.append({
            "id": q.id,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "max_marks": q.max_marks,
            "topic": q.topic,
            "keywords": q.keywords,
            "rubric": rubric_dict
        })
    rag_ingestion.ingest_exam_knowledge(exam_id, q_data)
