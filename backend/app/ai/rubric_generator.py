import json
import logging
from typing import Dict, Any, List
from app.ai.llm_provider import llm_provider

logger = logging.getLogger(__name__)

class RubricGenerator:
    @staticmethod
    async def generate_rubric(question_text: str, max_marks: float = 2.0, topic: str = "General") -> Dict[str, Any]:
        """
        Generates structured grading rubric, ideal model answer, and key answer keywords for a question.
        Ensures criteria marks sum exactly to max_marks.
        """
        if llm_provider.is_available():
            try:
                system_prompt = (
                    "You are a Senior Academic Examiner.\n"
                    "Generate a strict, comprehensive evaluation rubric and ideal benchmark model answer for the given exam question.\n"
                    f"The total maximum marks for this question is: {max_marks}.\n\n"
                    "Requirements:\n"
                    "1. Break down the evaluation into 2 to 4 distinct, concrete criteria.\n"
                    f"2. The sum of marks across all criteria MUST EQUAL EXACTLY the maximum marks ({max_marks}).\n"
                    "3. Provide a concise expected answer and a complete, ideal benchmark model answer.\n\n"
                    "Output ONLY a valid JSON object matching this schema:\n"
                    "{\n"
                    '  "criteria": [\n'
                    '    {"criterion": "Clear explanation of core concept", "marks": 1.0},\n'
                    '    {"criterion": "Mentioning key mechanisms/components", "marks": 0.5},\n'
                    '    {"criterion": "Providing relevant practical example or application", "marks": 0.5}\n'
                    "  ],\n"
                    '  "expected_answer": "Key points expected in student response...",\n'
                    '  "model_answer": "Complete, ideal benchmark answer addressing the question thoroughly..."\n'
                    "}"
                )
                user_prompt = f"Question: {question_text}\nMax Marks: {max_marks}\nTopic: {topic}"
                response_str = await llm_provider.generate_completion(system_prompt, user_prompt, json_mode=True)
                if response_str:
                    data = json.loads(response_str)
                    if "criteria" in data and len(data["criteria"]) > 0:
                        # Normalize marks sum to exactly max_marks
                        criteria = data["criteria"]
                        current_sum = sum(c.get("marks", 0.0) for c in criteria)
                        if abs(current_sum - max_marks) > 0.01 and current_sum > 0:
                            for c in criteria:
                                c["marks"] = round((c["marks"] / current_sum) * max_marks, 2)

                        return {
                            "criteria": criteria,
                            "expected_answer": data.get("expected_answer", f"Key explanation for {question_text}"),
                            "model_answer": data.get("model_answer", f"A complete definition and example addressing {question_text}")
                        }
            except Exception as e:
                logger.warning(f"LLM rubric generation failed: {e}. Using deterministic academic rubric builder.")

        # Deterministic Academic Rubric Builder (Works 100% offline)
        return RubricGenerator._generate_heuristic_rubric(question_text, max_marks, topic)

    @staticmethod
    def _generate_heuristic_rubric(question_text: str, max_marks: float, topic: str) -> Dict[str, Any]:
        q_lower = question_text.lower()
        
        if max_marks == 2.0:
            if "define" in q_lower or "what is" in q_lower:
                criteria = [
                    {"criterion": "Precise conceptual definition and technical terminology", "marks": 1.0},
                    {"criterion": "Key characteristics, purpose, or functionality", "marks": 0.5},
                    {"criterion": "Appropriate real-world example or use-case", "marks": 0.5}
                ]
            elif "difference" in q_lower or "differentiate" in q_lower or "distinguish" in q_lower or "compare" in q_lower:
                criteria = [
                    {"criterion": "First key distinguishing point with accurate contrast", "marks": 1.0},
                    {"criterion": "Second distinguishing point or tabular comparison", "marks": 0.5},
                    {"criterion": "Illustrative example for both concepts", "marks": 0.5}
                ]
            elif "state" in q_lower or "list" in q_lower or "name" in q_lower:
                criteria = [
                    {"criterion": "Accurate identification of primary components or rules", "marks": 1.0},
                    {"criterion": "Secondary elements or supporting factors", "marks": 0.5},
                    {"criterion": "Brief technical clarification", "marks": 0.5}
                ]
            else:
                criteria = [
                    {"criterion": "Core theoretical explanation and mechanism", "marks": 1.0},
                    {"criterion": "Secondary supporting concepts and workflow", "marks": 0.5},
                    {"criterion": "Practical context, application, or notation", "marks": 0.5}
                ]
        else:
            # Scalable for custom marks
            half_mark = round(max_marks * 0.5, 2)
            rem = round(max_marks - half_mark, 2)
            q1 = round(rem * 0.5, 2)
            q2 = round(rem - q1, 2)
            criteria = [
                {"criterion": "Core concept definition and explanation", "marks": half_mark},
                {"criterion": "Key technical characteristics and components", "marks": q1},
                {"criterion": "Illustrative example or practical context", "marks": q2}
            ]

        expected_answer = f"The student should explain the core principles of {topic}, specifically addressing: '{question_text}', highlighting the primary definition, working principles, and practical examples."
        model_answer = f"Accurate definition covering key principles of {topic}, accompanied by clear technical mechanisms and standard terminology."

        return {
            "criteria": criteria,
            "expected_answer": expected_answer,
            "model_answer": model_answer
        }

rubric_generator = RubricGenerator()
