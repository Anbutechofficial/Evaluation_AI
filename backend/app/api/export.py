from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app.models.exam import Exam
from app.models.submission import Submission, SubmissionStatus
from app.services.export_service import export_service

router = APIRouter(prefix="/export", tags=["Export Statements"])

@router.get("/marks/{exam_id}/pdf")
def export_marks_pdf(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    submissions = db.query(Submission).filter(
        Submission.exam_id == exam_id
    ).order_by(Submission.total_score.desc()).all()

    sub_dicts = [
        {
            "rank": s.rank or idx,
            "register_number": s.register_number,
            "student_name": s.student_name,
            "total_score": s.total_score,
            "max_score": s.max_score,
            "percentage": s.percentage,
            "status": s.status
        }
        for idx, s in enumerate(submissions, 1)
    ]

    pdf_path = export_service.generate_pdf_mark_statement(
        exam_name=exam.name,
        subject=exam.subject,
        class_name=f"{exam.class_name} ({exam.department})",
        submissions=sub_dicts
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_path)
    )

@router.get("/marks/{exam_id}/excel")
def export_marks_excel(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    submissions = db.query(Submission).filter(
        Submission.exam_id == exam_id
    ).order_by(Submission.total_score.desc()).all()

    sub_dicts = [
        {
            "rank": s.rank or idx,
            "register_number": s.register_number,
            "student_name": s.student_name,
            "total_score": s.total_score,
            "max_score": s.max_score,
            "percentage": s.percentage,
            "status": s.status
        }
        for idx, s in enumerate(submissions, 1)
    ]

    xlsx_path = export_service.generate_excel_mark_statement(
        exam_name=exam.name,
        subject=exam.subject,
        class_name=f"{exam.class_name} ({exam.department})",
        submissions=sub_dicts
    )

    return FileResponse(
        xlsx_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(xlsx_path)
    )
