from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import logging

from app.database import get_db
from app.models.exam import Exam, ExamStatus, QuestionPaper
from app.models.question import Question
from app.models.rubric import Rubric
from app.models.submission import Submission
from app.models.user import User
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.schemas.question import QuestionResponse
from app.utils.security import require_staff, require_current_user, get_current_user
from app.services.storage_service import storage_service
from app.services.pdf_service import pdf_service
from app.services.ocr_service import ocr_service
from app.ai.question_extractor import question_extractor
from app.ai.rubric_generator import rubric_generator
from app.rag.ingestion import rag_ingestion

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exams", tags=["Examinations"])

@router.get("", response_model=List[ExamResponse])
def get_all_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.created_at.desc()).all()
    results = []
    for ex in exams:
        sub_count = db.query(Submission).filter(Submission.exam_id == ex.id).count()
        resp = ExamResponse.model_validate(ex)
        resp.submissions_count = sub_count
        results.append(resp)
    return results

@router.get("/published", response_model=List[ExamResponse])
def get_published_exams_for_students(db: Session = Depends(get_db)):
    """Publicly accessible endpoint for students to view available published exams."""
    exams = db.query(Exam).filter(Exam.status == ExamStatus.PUBLISHED.value).order_by(Exam.created_at.desc()).all()
    return exams

@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam_by_id(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")
    
    sub_count = db.query(Submission).filter(Submission.exam_id == exam.id).count()
    resp = ExamResponse.model_validate(exam)
    resp.submissions_count = sub_count
    return resp

@router.post("", response_model=ExamResponse)
def create_exam(payload: ExamCreate, db: Session = Depends(get_db), current_user: User = Depends(require_staff)):
    exam = Exam(
        name=payload.name,
        subject=payload.subject,
        class_name=payload.class_name,
        department=payload.department,
        exam_date=payload.exam_date,
        duration_minutes=payload.duration_minutes,
        total_questions=payload.total_questions,
        total_marks=payload.total_marks,
        status=ExamStatus.DRAFT.value,
        created_by=current_user.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam

@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(exam_id: str, payload: ExamUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_staff)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(exam, field, val)

    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}")
def delete_exam(exam_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_staff)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    db.delete(exam)
    db.commit()
    return {"message": "Exam deleted successfully."}

@router.post("/{exam_id}/upload-question-paper", response_model=ExamResponse)
async def upload_and_process_question_paper(
    exam_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """
    Uploads a Question Paper PDF, runs PyMuPDF / OCR extraction,
    extracts structured 2-mark questions, automatically formulates evaluation rubrics,
    and indexes into RAG Vector Store.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported for question papers.")

    # 1. Save uploaded PDF
    saved = storage_service.save_file(file, subfolder="question_papers")
    file_path = saved["path"]

    # 2. Extract Text & Questions
    extracted_questions = []
    is_ocr = False
    try:
        pdf_res = pdf_service.extract_text(file_path)
        extracted_text = pdf_res["text"]

        # If PDF has images or text is minimal, execute Vision LLM extraction
        if pdf_res.get("needs_ocr") or pdf_res.get("has_images") or not extracted_text.strip():
            logger.info("Question paper contains images or appears scanned. Running Multimodal Vision extraction...")
            extracted_questions = await question_extractor.extract_questions_from_pdf_images(file_path)
            if extracted_questions:
                is_ocr = True
                extracted_text = "\n\n".join([
                    f"Q{q.get('question_number')}: {q.get('question_text')} ({q.get('max_marks', 2.0)} Marks)"
                    for q in extracted_questions
                ])

        # Fallback to text OCR if vision questions not directly extracted
        if not extracted_questions and (pdf_res.get("needs_ocr") or not extracted_text.strip()):
            logger.info("Running text OCR fallback for question paper...")
            ocr_res = await ocr_service.process_image_or_scanned_pdf(file_path)
            if ocr_res["text"]:
                extracted_text = ocr_res["text"]
                is_ocr = ocr_res["is_ocr_applied"]

    except Exception as e:
        logger.error(f"Error processing question paper PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    # 3. Save / Update QuestionPaper record
    qp = db.query(QuestionPaper).filter(QuestionPaper.exam_id == exam_id).first()
    if qp:
        qp.filename = saved["filename"]
        qp.file_path = file_path
        qp.file_size = saved["size"]
        qp.extracted_text = extracted_text
        qp.is_ocr = is_ocr
    else:
        qp = QuestionPaper(
            exam_id=exam_id,
            filename=saved["filename"],
            file_path=file_path,
            file_size=saved["size"],
            extracted_text=extracted_text,
            is_ocr=is_ocr
        )
        db.add(qp)

    # 4. Extract Questions using AI Extractor if not already extracted by Vision LLM
    if not extracted_questions:
        extracted_questions = await question_extractor.extract_questions_from_text(extracted_text)

    # Clear previous questions for this exam if re-uploaded
    db.query(Question).filter(Question.exam_id == exam_id).delete()

    created_questions_data = []
    total_calc_marks = 0.0

    for item in extracted_questions:
        max_m = float(item.get("max_marks", 2.0))
        total_calc_marks += max_m
        
        # Create Question Record
        q_rec = Question(
            exam_id=exam_id,
            question_number=item.get("question_number", 1),
            question_text=item.get("question_text", ""),
            max_marks=max_m,
            topic=item.get("topic", "General"),
            keywords=item.get("keywords", [])
        )
        db.add(q_rec)
        db.flush() # populate q_rec.id

        # 5. Generate Rubric for this question
        rubric_data = await rubric_generator.generate_rubric(
            question_text=q_rec.question_text,
            max_marks=max_m,
            topic=q_rec.topic
        )

        rubric_rec = Rubric(
            question_id=q_rec.id,
            criteria=rubric_data["criteria"],
            expected_answer=rubric_data["expected_answer"],
            model_answer=rubric_data["model_answer"]
        )
        db.add(rubric_rec)

        created_questions_data.append({
            "id": q_rec.id,
            "question_number": q_rec.question_number,
            "question_text": q_rec.question_text,
            "max_marks": max_m,
            "topic": q_rec.topic,
            "keywords": q_rec.keywords,
            "rubric": rubric_data
        })

    # Update Exam statistics
    exam.total_questions = len(created_questions_data)
    exam.total_marks = total_calc_marks if total_calc_marks > 0 else 20.0
    # Keep in DRAFT mode for teacher review before publishing
    exam.status = ExamStatus.DRAFT.value

    db.commit()
    db.refresh(exam)

    # 6. RAG Ingestion into Vector Store
    rag_ingestion.ingest_exam_knowledge(exam_id, created_questions_data)

    sub_count = db.query(Submission).filter(Submission.exam_id == exam.id).count()
    resp = ExamResponse.model_validate(exam)
    resp.submissions_count = sub_count
    return resp

@router.post("/create-with-question-paper", response_model=ExamResponse)
async def create_exam_with_question_paper(
    name: str = Form(...),
    subject: str = Form(...),
    class_name: str = Form(...),
    department: str = Form(...),
    duration_minutes: int = Form(90),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """
    Creates an Examination and processes its Question Paper PDF in a single step.
    Extracts questions, generates model answers, scoring keywords, and grading rubrics.
    """
    exam = Exam(
        name=name.strip(),
        subject=subject.strip(),
        class_name=class_name.strip(),
        department=department.strip(),
        duration_minutes=duration_minutes,
        total_questions=0,
        total_marks=20.0,
        status=ExamStatus.DRAFT.value,
        created_by=current_user.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    # Now run question paper processing on the newly created exam
    return await upload_and_process_question_paper(
        exam_id=exam.id,
        file=file,
        db=db,
        current_user=current_user
    )

@router.post("/{exam_id}/publish", response_model=ExamResponse)
def publish_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Publishes the exam so students can submit answer sheets in the Student Portal."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    q_count = db.query(Question).filter(Question.exam_id == exam_id).count()
    if q_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot publish an exam without questions. Please upload a question paper first."
        )

    exam.status = ExamStatus.PUBLISHED.value
    db.commit()
    db.refresh(exam)

    sub_count = db.query(Submission).filter(Submission.exam_id == exam.id).count()
    resp = ExamResponse.model_validate(exam)
    resp.submissions_count = sub_count
    return resp

@router.post("/{exam_id}/unpublish", response_model=ExamResponse)
def unpublish_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Unpublishes the exam back to draft status."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    exam.status = ExamStatus.DRAFT.value
    db.commit()
    db.refresh(exam)

    sub_count = db.query(Submission).filter(Submission.exam_id == exam.id).count()
    resp = ExamResponse.model_validate(exam)
    resp.submissions_count = sub_count
    return resp

