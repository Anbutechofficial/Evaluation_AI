import re
import json
import logging
from typing import List, Dict, Any
from app.ai.llm_provider import llm_provider

logger = logging.getLogger(__name__)

class QuestionExtractor:
    @staticmethod
    async def extract_questions_from_text(raw_text: str) -> List[Dict[str, Any]]:
        """
        Extracts structured questions from raw question paper text.
        Attempts LLM extraction first, then falls back to regex / rule-based question parser.
        """
        if not raw_text or not raw_text.strip():
            return []

        # 1. Try LLM extraction if available
        if llm_provider.is_available():
            try:
                system_prompt = (
                    "You are an expert examination processor. Extract all examination questions from the provided text.\n"
                    "For each question, output:\n"
                    "- question_number (integer)\n"
                    "- question_text (clean question text string)\n"
                    "- max_marks (float, default 2.0 if not specified)\n"
                    "- topic (broad technical topic name)\n\n"
                    "Return ONLY a JSON object formatted as:\n"
                    '{"questions": [{"question_number": 1, "question_text": "...", "max_marks": 2.0, "topic": "..."}]}'
                )
                user_prompt = f"Question Paper Text:\n{raw_text[:4000]}"
                response_str = await llm_provider.generate_completion(system_prompt, user_prompt, json_mode=True)
                if response_str:
                    data = json.loads(response_str)
                    if "questions" in data and len(data["questions"]) > 0:
                        return data["questions"]
            except Exception as e:
                logger.warning(f"LLM question extraction failed: {e}. Falling back to rule-based extractor.")

        # 2. Heuristic Rule-Based Regex Extractor
        return QuestionExtractor._heuristic_extract(raw_text)

    @staticmethod
    def _heuristic_extract(text: str) -> List[Dict[str, Any]]:
        questions = []
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        # Regex patterns to match question headers: "1.", "Q1.", "Q1:", "Question 1:", "1)"
        q_pattern = re.compile(r"^(?:Question\s+|Q)?(\d+)[\.\:\)\-]\s*(.*)", re.IGNORECASE)
        # Regex to detect marks like "(2 Marks)", "[2M]", "(2m)", "2 marks"
        marks_pattern = re.compile(r"[\(\[\{]\s*(\d+(?:\.\d+)?)\s*(?:marks?|m|pts?)?\s*[\)\]\}]", re.IGNORECASE)

        current_q_num = None
        current_text = []
        current_marks = 2.0

        for line in lines:
            # Skip common header metadata lines
            if any(skip_word in line.lower() for skip_word in [
                "internal assessment", "duration:", "maximum marks", "reg. no", "department of",
                "answer all questions", "part a", "part - a", "semester"
            ]) and not q_pattern.match(line):
                continue

            match = q_pattern.match(line)
            if match:
                # Save previous question if exists
                if current_q_num is not None and current_text:
                    full_q_text = " ".join(current_text).strip()
                    if len(full_q_text) > 5:
                        questions.append(QuestionExtractor._format_question(current_q_num, full_q_text, current_marks))
                
                try:
                    current_q_num = int(match.group(1))
                except ValueError:
                    current_q_num = len(questions) + 1

                remainder = match.group(2).strip()
                
                # Check for inline marks
                marks_match = marks_pattern.search(remainder)
                if marks_match:
                    try:
                        current_marks = float(marks_match.group(1))
                    except ValueError:
                        current_marks = 2.0
                    remainder = marks_pattern.sub("", remainder).strip()
                else:
                    current_marks = 2.0

                current_text = [remainder] if remainder else []
            else:
                if current_q_num is not None:
                    # Check if line contains marks pattern
                    marks_match = marks_pattern.search(line)
                    if marks_match:
                        try:
                            current_marks = float(marks_match.group(1))
                        except ValueError:
                            pass
                        line = marks_pattern.sub("", line).strip()
                    if line:
                        current_text.append(line)

        # Append last question
        if current_q_num is not None and current_text:
            full_q_text = " ".join(current_text).strip()
            if len(full_q_text) > 5:
                questions.append(QuestionExtractor._format_question(current_q_num, full_q_text, current_marks))

        # Fallback if no questions matched (e.g. unstructured paragraph)
        if not questions:
            sentences = [s.strip() for s in re.split(r'(?<=[.?!])\s+', text) if len(s.strip()) > 15]
            for idx, s in enumerate(sentences[:10], 1):
                questions.append(QuestionExtractor._format_question(idx, s, 2.0))

        return questions

    @staticmethod
    def _format_question(q_num: int, q_text: str, marks: float) -> Dict[str, Any]:
        # Detect topic and keywords
        words = re.findall(r'\b[A-Za-z]{4,}\b', q_text)
        topic = "General AI / Computer Science"
        
        # Topic heuristic mapping
        q_lower = q_text.lower()
        if "intelligence" in q_lower or "turing" in q_lower or "agent" in q_lower:
            topic = "Artificial Intelligence Fundamentals"
        elif "heuristic" in q_lower or "search" in q_lower or "a*" in q_lower or "bfs" in q_lower:
            topic = "Heuristic Search & Problem Solving"
        elif "knowledge" in q_lower or "ontology" in q_lower or "first order" in q_lower or "logic" in q_lower:
            topic = "Knowledge Representation & Logic"
        elif "machine learning" in q_lower or "supervised" in q_lower or "clustering" in q_lower:
            topic = "Machine Learning Basics"
        elif "neural" in q_lower or "backpropagation" in q_lower or "activation" in q_lower:
            topic = "Deep Learning & Neural Networks"
        elif "nlp" in q_lower or "tokenization" in q_lower or "language" in q_lower or "rag" in q_lower:
            topic = "Natural Language Processing & RAG"
        elif "expert system" in q_lower or "inference" in q_lower or "rule" in q_lower:
            topic = "Expert Systems & Inference"

        return {
            "question_number": q_num,
            "question_text": q_text,
            "max_marks": marks,
            "topic": topic
        }

    @staticmethod
    async def extract_questions_from_pdf_images(file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts structured examination questions from a Question Paper PDF containing images or scanned pages.
        Uses Multimodal Vision LLM to read the images directly.
        """
        from app.services.ocr_service import ocr_service
        try:
            questions = await ocr_service.process_question_paper_images(file_path)
            if questions:
                return questions
        except Exception as e:
            logger.warning(f"Vision Question Paper extraction error: {e}")
        return []

question_extractor = QuestionExtractor()

