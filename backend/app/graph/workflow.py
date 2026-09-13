import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.graph.state import LangGraphEvaluationState
from app.graph.nodes import (
    load_submission_node,
    extract_answers_node,
    match_answers_node,
    retrieve_rag_context_node,
    evaluate_rubric_node,
    validate_evaluation_node,
    confidence_gate_node,
    save_evaluation_node
)
from app.models.submission import Submission, SubmissionStatus

logger = logging.getLogger(__name__)

class LangGraphEvaluationWorkflow:
    """
    Orchestrates the multi-node Agentic RAG Evaluation Workflow.
    Workflow Execution:
    START -> Load Submission -> Extract Answers (with OCR fallback) -> Match Answers to Questions
    -> Retrieve RAG Context & Rubrics -> AI Rubric Evaluation -> Deterministic Mark Validation
    -> Confidence Gate & Flagging -> Save Evaluation & Status -> END
    """

    @staticmethod
    async def run_evaluation(exam_id: str, submission_id: str, db: Session) -> Dict[str, Any]:
        state: LangGraphEvaluationState = {
            "exam_id": exam_id,
            "submission_id": submission_id,
            "student_name": "",
            "register_number": "",
            "file_path": "",
            "raw_extracted_text": "",
            "is_ocr_applied": False,
            "extracted_qa_pairs": [],
            "evaluations": [],
            "total_score": 0.0,
            "max_score": 20.0,
            "percentage": 0.0,
            "has_manual_review_flags": False,
            "status": SubmissionStatus.PROCESSING.value,
            "error": None
        }

        try:
            # 1. Load Submission
            res1 = await load_submission_node(state, db)
            state.update(res1)
            if state.get("error"):
                return {"success": False, "error": state["error"]}

            # 2. Extract Answers from PDF/OCR
            res2 = await extract_answers_node(state, db)
            state.update(res2)
            if state.get("error"):
                return {"success": False, "error": state["error"]}

            # 3. Match Answers to Questions
            res3 = await match_answers_node(state, db)
            state.update(res3)
            if state.get("error"):
                return {"success": False, "error": state["error"]}

            # 4. Retrieve RAG Context & Rubrics
            res4 = await retrieve_rag_context_node(state, db)
            state.update(res4)

            # 5. Evaluate Answers with Rubrics
            res5 = await evaluate_rubric_node(state, db)
            state.update(res5)

            # 6. Validate Marks Deterministically
            res6 = await validate_evaluation_node(state, db)
            state.update(res6)

            # 7. Confidence Check & Flagging
            res7 = await confidence_gate_node(state, db)
            state.update(res7)

            # 8. Save Evaluation into DB
            res8 = await save_evaluation_node(state, db)
            state.update(res8)

            return {
                "success": True,
                "submission_id": submission_id,
                "total_score": state["total_score"],
                "max_score": state["max_score"],
                "percentage": state["percentage"],
                "status": state["status"],
                "evaluations_count": len(state["evaluations"]),
                "has_manual_review_flags": state["has_manual_review_flags"]
            }

        except Exception as e:
            logger.error(f"LangGraph Workflow failed for submission {submission_id}: {e}", exc_info=True)
            # Update submission status to error
            try:
                sub = db.query(Submission).filter(Submission.id == submission_id).first()
                if sub:
                    sub.status = SubmissionStatus.MANUAL_REVIEW.value
                    db.commit()
            except Exception:
                pass
            return {"success": False, "error": str(e)}

evaluation_workflow = LangGraphEvaluationWorkflow()
