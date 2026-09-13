import re
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.graph.state import LangGraphEvaluationState, QuestionEvaluationItem
from app.services.pdf_service import pdf_service
from app.services.ocr_service import ocr_service
from app.rag.retriever import rag_retriever
from app.ai.evaluator import ai_evaluator
from app.models.submission import Submission, SubmissionStatus, StudentAnswer
from app.models.evaluation import Evaluation
from app.models.question import Question
from app.models.rubric import Rubric
from app.config import settings

logger = logging.getLogger(__name__)

async def load_submission_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 1: Loads submission records from DB."""
    submission = db.query(Submission).filter(Submission.id == state["submission_id"]).first()
    if not submission:
        return {"error": f"Submission {state['submission_id']} not found."}

    submission.status = SubmissionStatus.PROCESSING.value
    db.commit()

    return {
        "student_name": submission.student_name,
        "register_number": submission.register_number,
        "file_path": submission.file_path,
        "error": None
    }

async def extract_answers_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 2: Extracts text from PDF with Vision LLM and OCR fallback for handwritten papers."""
    file_path = state["file_path"]
    exam_id = state["exam_id"]

    # Fetch question metadata to assist Vision OCR matching
    questions = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.question_number).all()
    q_metadata = [
        {
            "question_number": q.question_number,
            "question_text": q.question_text,
            "topic": q.topic
        }
        for q in questions
    ]

    try:
        pdf_res = pdf_service.extract_text(file_path)
        raw_text = pdf_res["text"]
        structured_answers = []
        is_ocr = False

        # Trigger Multimodal Vision LLM if PDF has images, needs OCR, or has minimal text
        if pdf_res.get("has_images") or pdf_res.get("needs_ocr") or len(raw_text.strip()) < 80:
            logger.info("Answer sheet contains images or handwriting. Triggering Gemini Multimodal Vision Extraction...")
            ocr_res = await ocr_service.process_image_or_scanned_pdf(file_path, q_metadata)
            if ocr_res.get("text") or ocr_res.get("structured_answers"):
                raw_text = ocr_res["text"]
                is_ocr = ocr_res["is_ocr_applied"]
                structured_answers = ocr_res.get("structured_answers", [])

        return {
            "raw_extracted_text": raw_text,
            "structured_answers": structured_answers,
            "is_ocr_applied": is_ocr
        }
    except Exception as e:
        logger.error(f"Error in extract_answers_node: {e}")
        return {"error": f"PDF Extraction Error: {str(e)}"}

async def match_answers_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 3: Segments raw text into question-wise answers and matches to exam questions."""
    raw_text = state.get("raw_extracted_text", "")
    structured_answers = state.get("structured_answers", [])
    exam_id = state["exam_id"]
    
    # Load all questions for this exam
    questions = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.question_number).all()
    if not questions:
        return {"error": "No questions found for this exam."}

    answers_by_num = {}

    # 1. If Vision OCR produced direct structured answers, use them directly
    if structured_answers:
        for sa in structured_answers:
            q_num = sa.get("question_number")
            ans_txt = sa.get("answer_text", "").strip()
            if q_num and ans_txt:
                try:
                    answers_by_num[int(q_num)] = ans_txt
                except ValueError:
                    pass

    # 2. If not already fully mapped, run regex segmentation on text
    if len(answers_by_num) < len(questions) and raw_text:
        # Regex patterns matching: "1.", "1)", "Q1:", "Question 1", "Ans 1:", etc.
        q_ans_pattern = re.compile(
            r"(?:(?:Question|Q|Ans|Answer)\s*(\d+)[\.\:\)\-]|^\s*(\d+)[\.\:\)\-])\s*(.*?)(?=(?:(?:Question|Q|Ans|Answer)\s*\d+[\.\:\)\-]|^\s*\d+[\.\:\)\-]|\Z))",
            re.IGNORECASE | re.DOTALL | re.MULTILINE
        )

        matches = q_ans_pattern.findall(raw_text)
        for m in matches:
            num_str = m[0] or m[1]
            ans_content = m[2].strip()
            try:
                q_num = int(num_str)
                if q_num not in answers_by_num or len(ans_content) > len(answers_by_num.get(q_num, "")):
                    answers_by_num[q_num] = ans_content
            except ValueError:
                continue

    # 3. Clean and map each question
    qa_pairs = []
    for q in questions:
        ans_text = answers_by_num.get(q.question_number, "")
        
        # If student rewrote question text before answering, remove the question prompt
        if ans_text and q.question_text.lower() in ans_text.lower():
            # Strip question text from the extracted answer
            ans_text = re.sub(re.escape(q.question_text), "", ans_text, flags=re.IGNORECASE).strip()
            ans_text = re.sub(r'^(?:What is|Explain|Define|Differentiate|State|Give).*?\?', '', ans_text, flags=re.IGNORECASE).strip()

        # Fallback 1: Line-by-line regex if text exists
        if not ans_text and raw_text:
            lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
            for i, line in enumerate(lines):
                if re.match(rf"^(?:Q\s*)?{q.question_number}[\.\:\)\-]", line, re.IGNORECASE):
                    collected = [line]
                    for next_line in lines[i+1:i+4]:
                        if re.match(r"^(?:Q\s*)?\d+[\.\:\)\-]", next_line, re.IGNORECASE):
                            break
                        collected.append(next_line)
                    ans_text = " ".join(collected)
                    break

        # Fallback 2: Question Concept & Title Term Matching
        if not ans_text and raw_text:
            q_terms = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', q.question_text)
                       if w.lower() not in {"what", "state", "explain", "define", "give", "with", "between", "which"}]
            
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 15]
            best_p = ""
            best_score = 0
            for p in paragraphs:
                p_lower = p.lower()
                matches = sum(1 for term in q_terms if term in p_lower)
                if matches > best_score and matches >= 1:
                    best_score = matches
                    best_p = p
            if best_p:
                ans_text = best_p

        qa_pairs.append({
            "question_id": q.id,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "topic": q.topic or "General",
            "max_marks": q.max_marks,
            "student_answer": ans_text if ans_text else "Unanswered"
        })

    return {"extracted_qa_pairs": qa_pairs}

async def retrieve_rag_context_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 4: Retrieves rubric & context for each question via RAG retriever."""
    qa_pairs = state.get("extracted_qa_pairs", [])
    exam_id = state["exam_id"]
    
    enriched_items = []
    for item in qa_pairs:
        q_id = item["question_id"]
        # Fetch rubric from DB
        rubric_rec = db.query(Rubric).filter(Rubric.question_id == q_id).first()
        criteria = rubric_rec.criteria if rubric_rec else []
        expected_ans = rubric_rec.expected_answer if rubric_rec else ""
        model_ans = rubric_rec.model_answer if rubric_rec else ""
        
        # RAG context retrieval
        rag_res = rag_retriever.retrieve_context_for_answer(exam_id, q_id, item["student_answer"])
        context_text = rag_res["context_text"] if rag_res["found"] else ""

        enriched_items.append({
            **item,
            "rubric_criteria": criteria,
            "expected_answer": expected_ans,
            "model_answer": model_ans,
            "retrieved_context": context_text
        })

    return {"extracted_qa_pairs": enriched_items}

async def evaluate_rubric_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 5: Runs AI evaluation directly matching against the benchmark model answer."""
    qa_items = state.get("extracted_qa_pairs", [])
    evaluations = []

    for item in qa_items:
        eval_result = await ai_evaluator.evaluate_answer(
            question_text=item["question_text"],
            student_answer=item["student_answer"],
            rubric_criteria=item["rubric_criteria"],
            expected_answer=item.get("expected_answer", ""),
            model_answer=item.get("model_answer", ""),
            max_marks=item["max_marks"],
            topic=item["topic"]
        )

        evaluations.append({
            "question_id": item["question_id"],
            "question_number": item["question_number"],
            "question_text": item["question_text"],
            "topic": item["topic"],
            "max_marks": item["max_marks"],
            "student_answer": item["student_answer"],
            "rubric_criteria": item["rubric_criteria"],
            "expected_answer": item.get("expected_answer", ""),
            "model_answer": item.get("model_answer", ""),
            "retrieved_context": item.get("retrieved_context", ""),
            "marks_obtained": eval_result["marks_obtained"],
            "model_alignment_score": eval_result.get("model_alignment_score", 0.0),
            "confidence": eval_result["confidence"],
            "reason": eval_result["reason"],
            "feedback": eval_result["feedback"],
            "missing_points": eval_result["missing_points"],
            "needs_manual_review": eval_result["needs_manual_review"]
        })

    return {"evaluations": evaluations}

async def validate_evaluation_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 6: Deterministic validation of all marks."""
    evaluations = state.get("evaluations", [])
    total_score = 0.0
    max_score = 0.0

    for ev in evaluations:
        # Enforce strict bounds: 0 <= marks <= max_marks
        ev["marks_obtained"] = max(0.0, min(ev["marks_obtained"], ev["max_marks"]))
        total_score += ev["marks_obtained"]
        max_score += ev["max_marks"]

    total_score = round(total_score, 2)
    max_score = round(max_score, 2) if max_score > 0 else 20.0
    percentage = round((total_score / max_score) * 100, 2) if max_score > 0 else 0.0

    return {
        "evaluations": evaluations,
        "total_score": total_score,
        "max_score": max_score,
        "percentage": percentage
    }

async def confidence_gate_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 7: Checks confidence levels and flags for manual review if confidence < 0.70."""
    evaluations = state.get("evaluations", [])
    has_flags = False

    for ev in evaluations:
        if ev["confidence"] < settings.CONFIDENCE_THRESHOLD or ev["needs_manual_review"]:
            ev["needs_manual_review"] = True
            has_flags = True

    status_val = SubmissionStatus.MANUAL_REVIEW.value if has_flags else SubmissionStatus.EVALUATED.value

    return {
        "evaluations": evaluations,
        "has_manual_review_flags": has_flags,
        "status": status_val
    }

async def save_evaluation_node(state: LangGraphEvaluationState, db: Session) -> Dict[str, Any]:
    """Node 8: Persists all evaluation data and answers into database."""
    submission_id = state["submission_id"]
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        return {"error": f"Submission {submission_id} not found during save."}

    # Delete existing student answers and evaluations for clean rerun
    db.query(StudentAnswer).filter(StudentAnswer.submission_id == submission_id).delete()
    db.query(Evaluation).filter(Evaluation.submission_id == submission_id).delete()

    # Save Student Answers & Evaluations
    for ev in state.get("evaluations", []):
        # Student Answer Record
        ans_rec = StudentAnswer(
            submission_id=submission_id,
            question_id=ev["question_id"],
            extracted_answer_text=ev["student_answer"],
            confidence_score=ev["confidence"]
        )
        db.add(ans_rec)

        # Evaluation Record
        eval_rec = Evaluation(
            submission_id=submission_id,
            question_id=ev["question_id"],
            marks_obtained=ev["marks_obtained"],
            max_marks=ev["max_marks"],
            confidence=ev["confidence"],
            reason=ev["reason"],
            feedback=ev["feedback"],
            missing_points=ev["missing_points"],
            needs_manual_review=ev["needs_manual_review"],
            final_mark=ev["marks_obtained"],
            is_overridden=False
        )
        db.add(eval_rec)

    submission.total_score = state["total_score"]
    submission.max_score = state["max_score"]
    submission.percentage = state["percentage"]
    submission.status = state["status"]
    submission.extracted_text = state.get("raw_extracted_text", "")

    db.commit()
    db.refresh(submission)

    return {"status": submission.status}
