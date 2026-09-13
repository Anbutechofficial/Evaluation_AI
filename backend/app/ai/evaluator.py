import json
import logging
import re
import difflib
from typing import Dict, Any, List
from app.ai.llm_provider import llm_provider

logger = logging.getLogger(__name__)

class AIEvaluator:
    @staticmethod
    async def evaluate_answer(
        question_text: str,
        student_answer: str,
        rubric_criteria: List[Dict[str, Any]],
        expected_answer: str = "",
        model_answer: str = "",
        max_marks: float = 2.0,
        topic: str = "General",
        keywords: List[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a single student answer by directly comparing and matching it against
        the LLM-Generated Benchmark Model Answer and rubric criteria.
        Returns marks, model alignment score, confidence, justification, and feedback.
        """
        # Clean answer
        answer_clean = student_answer.strip()
        benchmark_answer = (model_answer or expected_answer or "").strip()

        if not answer_clean or len(answer_clean) < 3 or answer_clean.lower() in ["none", "unanswered", "nil", "n/a"]:
            return {
                "marks_obtained": 0.0,
                "max_marks": max_marks,
                "model_alignment_score": 0.0,
                "confidence": 0.99,
                "reason": "The question was left unanswered or contains no relevant academic content.",
                "feedback": "Please attempt the question with conceptual explanations matching the benchmark model answer.",
                "missing_points": [c.get("criterion", "Expected core concept") for c in rubric_criteria],
                "needs_manual_review": False
            }

        # 1. Attempt LLM Evaluation comparing against Benchmark Model Answer
        if llm_provider.is_available():
            try:
                criteria_str = "\n".join([f"- Criterion: {c.get('criterion')} (Marks: {c.get('marks')})" for c in rubric_criteria])
                system_prompt = (
                    "You are a Senior Academic Examination Evaluator.\n"
                    "Your task is to accurately evaluate the student's answer by directly MATCHING AND COMPARING it against the "
                    "LLM Generated Benchmark Model Answer (Ideal Benchmark) and Rubric Criteria.\n\n"
                    f"Maximum Marks Allowed: {max_marks}\n\n"
                    "Evaluation Instructions:\n"
                    "1. DIRECT COMPARISON: Compare the student's response directly against the Benchmark Model Answer. "
                    "Determine whether the student's explanation conveys the equivalent conceptual meaning, depth, and validity as the model answer.\n"
                    f"2. MARKS BOUNDS: Marks awarded MUST NOT exceed {max_marks} and MUST NOT be negative (0.0 <= marks_obtained <= {max_marks}).\n"
                    "3. CRITERIA BREAKDOWN: Award partial or full marks based on how well the student satisfies each rubric criterion in alignment with the model answer.\n"
                    "4. OCR TOLERANCE: Forgive minor transcription, handwriting OCR, or spelling errors; evaluate the student's underlying conceptual comprehension.\n"
                    "5. MODEL ALIGNMENT SCORE: Estimate a percentage score (0 to 100) representing how well the student's explanation matches the ideal benchmark model answer.\n"
                    "6. Output ONLY a valid JSON object matching this schema:\n"
                    "{\n"
                    f'  "marks_obtained": 1.5,\n'
                    f'  "max_marks": {max_marks},\n'
                    '  "model_alignment_score": 85.0,\n'
                    '  "confidence": 0.95,\n'
                    '  "reason": "Detailed academic evaluation directly comparing student answer with the benchmark model answer...",\n'
                    '  "feedback": "Constructive pedagogical feedback telling the student what was missed from the benchmark model answer...",\n'
                    '  "missing_points": ["Concepts from model answer omitted by the student"],\n'
                    '  "needs_manual_review": false\n'
                    "}"
                )
                user_prompt = (
                    "### EXAMINATION QUESTION:\n"
                    f"Question: {question_text}\n"
                    f"Subject Topic: {topic}\n"
                    f"Max Marks: {max_marks}\n\n"
                    "### BENCHMARK MODEL ANSWER (Ideal Benchmark from Staff Portal):\n"
                    f"{benchmark_answer}\n\n"
                    "### RUBRIC CRITERIA:\n"
                    f"{criteria_str}\n\n"
                    "### STUDENT EXTRACTED ANSWER (From Uploaded Paper):\n"
                    f"{student_answer}\n\n"
                    "### TASK:\n"
                    "Compare the student's answer directly with the Benchmark Model Answer. Evaluate conceptual equivalence and score marks."
                )
                response_str = await llm_provider.generate_completion(system_prompt, user_prompt, json_mode=True)
                if response_str:
                    data = json.loads(response_str)
                    marks = float(data.get("marks_obtained", 0.0))
                    marks = max(0.0, min(marks, max_marks))
                    alignment = float(data.get("model_alignment_score", round((marks / max(0.1, max_marks)) * 100, 1)))
                    confidence = float(data.get("confidence", 0.90))
                    needs_review = bool(data.get("needs_manual_review", False)) or (confidence < 0.70)

                    return {
                        "marks_obtained": round(marks, 2),
                        "max_marks": max_marks,
                        "model_alignment_score": round(max(0.0, min(alignment, 100.0)), 1),
                        "confidence": round(confidence, 2),
                        "reason": data.get("reason", "Evaluated against benchmark model answer."),
                        "feedback": data.get("feedback", "Review the benchmark model answer for full marks."),
                        "missing_points": data.get("missing_points", []),
                        "needs_manual_review": needs_review
                    }
            except Exception as e:
                logger.warning(f"LLM answer evaluation failed: {e}. Falling back to deterministic model answer comparison.")

        # 2. Heuristic Benchmark Model Answer Comparison (Offline Fallback)
        return AIEvaluator._heuristic_evaluate(question_text, student_answer, rubric_criteria, benchmark_answer, max_marks, topic)

    @staticmethod
    def _heuristic_evaluate(
        question_text: str,
        student_answer: str,
        rubric_criteria: List[Dict[str, Any]],
        model_answer: str,
        max_marks: float,
        topic: str
    ) -> Dict[str, Any]:
        ans_lower = student_answer.lower()
        model_lower = model_answer.lower() if model_answer else ""
        earned_marks = 0.0
        missing_points = []
        satisfied_criteria = []

        if not rubric_criteria:
            rubric_criteria = [
                {"criterion": "Conceptual definition matching model answer", "marks": max_marks * 0.5},
                {"criterion": "Key technical explanation and example", "marks": max_marks * 0.5}
            ]

        def _token_matches(token: str, text: str) -> bool:
            if token in text:
                return True
            if len(token) >= 4:
                words = re.findall(r'\b[a-zA-Z]{4,}\b', text)
                for w in words:
                    if abs(len(w) - len(token)) <= 2:
                        if difflib.SequenceMatcher(None, token, w).ratio() >= 0.80:
                            return True
            return False

        # Evaluate criteria against student's text
        for c in rubric_criteria:
            criterion_text = c.get("criterion", "")
            c_marks = float(c.get("marks", 0.5))

            key_tokens = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', criterion_text)
                          if w.lower() not in {"explains", "definition", "mentioning", "providing", "concept", "clear", "accurate"}]
            if not key_tokens:
                key_tokens = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', criterion_text)]

            match_count = sum(1 for token in key_tokens if _token_matches(token, ans_lower))
            match_ratio = (match_count / max(1, len(key_tokens)))

            if match_ratio >= 0.5 or (len(key_tokens) == 1 and match_count == 1):
                earned_marks += c_marks
                satisfied_criteria.append(criterion_text)
            elif match_ratio >= 0.25:
                partial = round(c_marks * 0.5, 2)
                earned_marks += partial
                satisfied_criteria.append(f"{criterion_text} (partially)")
            else:
                missing_points.append(criterion_text)

        # Direct Model Answer Semantic Similarity Comparison
        seq_ratio = 0.0
        if model_lower:
            seq_ratio = difflib.SequenceMatcher(None, ans_lower, model_lower).ratio()
            # If high semantic similarity with model answer, boost earned marks
            if seq_ratio >= 0.60 and earned_marks < max_marks:
                earned_marks = max(earned_marks, round(max_marks * seq_ratio, 2))
            elif seq_ratio >= 0.40 and earned_marks == 0.0:
                earned_marks = round(max_marks * 0.5, 2)
                satisfied_criteria.append("Conceptual alignment with benchmark model answer")

        earned_marks = max(0.0, min(round(earned_marks, 2), max_marks))
        alignment_score = round(max(seq_ratio * 100, (earned_marks / max(0.1, max_marks)) * 100), 1)
        alignment_score = min(100.0, max(0.0, alignment_score))

        confidence = 0.90
        words_count = len(ans_lower.split())
        if words_count < 8:
            confidence = 0.80

        needs_review = False
        if len(ans_lower) > 30 and earned_marks == 0.0:
            confidence = 0.65
            needs_review = True

        if earned_marks >= max_marks:
            reason = "Excellent response. The student's explanation closely matches the ideal benchmark model answer with accurate terminology."
            feedback = "Outstanding answer! Full conceptual equivalence with the model benchmark demonstrated."
        elif earned_marks > 0:
            reason = f"Good attempt. The student captured core elements of the benchmark model answer, but missed key nuances: {', '.join(missing_points[:2])}."
            feedback = f"Review the benchmark model answer. Include: {', '.join(missing_points[:2])} for full marks."
        else:
            reason = "The provided answer does not conceptually align with the ideal benchmark model answer."
            feedback = f"Compare your response with the model benchmark for topic '{topic}'."

        return {
            "marks_obtained": earned_marks,
            "max_marks": max_marks,
            "model_alignment_score": alignment_score,
            "confidence": confidence,
            "reason": reason,
            "feedback": feedback,
            "missing_points": missing_points,
            "needs_manual_review": needs_review
        }

ai_evaluator = AIEvaluator()
