from typing import Literal
from app.graph.state import LangGraphEvaluationState

def check_extraction_status(state: LangGraphEvaluationState) -> Literal["proceed", "error"]:
    """Conditional edge determining whether extraction succeeded."""
    if state.get("error") or not state.get("raw_extracted_text"):
        return "error"
    return "proceed"

def check_confidence_and_review(state: LangGraphEvaluationState) -> Literal["manual_review", "finalize_auto"]:
    """Conditional edge checking whether any question requires manual teacher review."""
    if state.get("has_manual_review_flags", False):
        return "manual_review"
    return "finalize_auto"
