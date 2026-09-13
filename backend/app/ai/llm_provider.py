import os
import json
import logging
import base64
import io
from typing import Dict, Any, Optional, List
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash"
]

class LLMProvider:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self._gemini_client = None

    def _get_gemini_client(self):
        gemini_k = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not gemini_k:
            return None
        if self._gemini_client is None:
            try:
                from google import genai
                self._gemini_client = genai.Client(
                    api_key=gemini_k,
                    http_options={"timeout": 60000}
                )
            except Exception as e:
                logger.error(f"Failed to initialize google.genai Client: {e}")
        return self._gemini_client

    def is_available(self) -> bool:
        openai_k = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        gemini_k = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if self.provider == "openai" and openai_k:
            return True
        if self.provider == "gemini" and gemini_k:
            return True
        if (openai_k or gemini_k) and self.provider == "auto":
            return True
        return False

    async def generate_completion(self, system_prompt: str, user_prompt: str, json_mode: bool = True) -> str:
        """
        Executes text LLM request via Gemini (with model cascade fallback) or OpenAI.
        """
        openai_k = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        client = self._get_gemini_client()

        # 1. Try Gemini with cascading model fallback
        if (self.provider in ["auto", "gemini"]) and client:
            combined_prompt = f"System Instructions:\n{system_prompt}\n\nTask Input:\n{user_prompt}"
            if json_mode:
                combined_prompt += "\n\nCRITICAL: Respond ONLY with a valid JSON object. Do not include extra text outside JSON."

            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=combined_prompt
                    )
                    if response and response.text:
                        raw_text = response.text.strip()
                        if "```json" in raw_text:
                            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                        elif "```" in raw_text:
                            raw_text = raw_text.split("```")[1].split("```")[0].strip()
                        return raw_text
                except Exception as e:
                    logger.warning(f"Gemini {model_name} completion error: {e}. Trying next model...")

        # 2. Try OpenAI fallback
        if (self.provider in ["auto", "openai"]) and openai_k:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {openai_k}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                }
                if json_mode:
                    body["response_format"] = {"type": "json_object"}

                async with httpx.AsyncClient(timeout=45.0) as http_client:
                    resp = await http_client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        logger.warning(f"OpenAI error {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"OpenAI request failed: {e}")

        return ""

    async def extract_handwritten_pages_vision(self, base64_images: List[str], questions_metadata: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Multimodal Vision OCR specifically tailored for handwritten and image-based examination answer sheets.
        Passes high-resolution rendered PDF page images directly to Gemini Vision models.
        Extracts student's handwritten answers matching each question number.
        """
        if not base64_images:
            return []

        q_context_str = ""
        if questions_metadata:
            q_context_str = "Known Staff Exam Questions & Topics:\n" + "\n".join([
                f"- Question {q.get('question_number')}: {q.get('question_text')} (Topic: {q.get('topic', 'General')})"
                for q in questions_metadata
            ])

        prompt = (
            "You are an expert academic OCR and multimodal handwriting transcription system.\n"
            "Carefully analyze all the attached examination answer sheet images written by the student.\n\n"
            "Task Instructions:\n"
            "1. Transcribe the student's handwritten answers for EVERY question attempted (e.g. 1, 2, 3... 10).\n"
            "2. Match each answer to its respective question_number (integer).\n"
            "3. If question numbers are written in margins (e.g. '1.', '1)', 'Q1:', 'Ans 1:'), extract the number and full written text.\n"
            "4. Even if handwriting is cursive, messy, or faded, transcribe it as accurately and completely as possible without skipping answers.\n"
            "5. If equations, formulas, or diagrams with labels are written, transcribe them textually.\n"
            "6. Output ONLY a valid JSON object in this exact format:\n"
            "{\n"
            '  "answers": [\n'
            '    {"question_number": 1, "answer_text": "complete student handwritten answer...", "confidence": 0.95},\n'
            '    {"question_number": 2, "answer_text": "complete student handwritten answer...", "confidence": 0.95}\n'
            '  ]\n'
            "}\n\n"
            f"{q_context_str}"
        )

        client = self._get_gemini_client()

        # 1. Try Gemini Vision with cascading models
        if (self.provider in ["auto", "gemini"]) and client:
            pil_images = []
            for b64 in base64_images:
                try:
                    img_bytes = base64.b64decode(b64)
                    pil_img = Image.open(io.BytesIO(img_bytes))
                    pil_images.append(pil_img)
                except Exception as e:
                    logger.warning(f"Could not decode base64 image: {e}")

            if pil_images:
                contents = [*pil_images, prompt]
                for model_name in GEMINI_MODELS:
                    try:
                        logger.info(f"Invoking Multimodal Vision OCR with model {model_name} on {len(pil_images)} image(s)...")
                        response = client.models.generate_content(
                            model=model_name,
                            contents=contents
                        )
                        if response and response.text:
                            raw_text = response.text.strip()
                            if "```json" in raw_text:
                                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                            elif "```" in raw_text:
                                raw_text = raw_text.split("```")[1].split("```")[0].strip()

                            parsed = json.loads(raw_text)
                            if isinstance(parsed, list):
                                answers = parsed
                            else:
                                answers = parsed.get("answers", [])
                            
                            if answers:
                                # Ensure integer question_number
                                clean_answers = []
                                for a in answers:
                                    raw_q = str(a.get("question_number", "")).lower().replace("q", "").replace(".", "").strip()
                                    try:
                                        q_num = int(raw_q)
                                    except ValueError:
                                        q_num = a.get("question_number")
                                    clean_answers.append({
                                        "question_number": q_num,
                                        "answer_text": a.get("answer_text", "").strip(),
                                        "confidence": float(a.get("confidence", 0.95))
                                    })
                                logger.info(f"Gemini {model_name} successfully transcribed {len(clean_answers)} handwritten answers from PDF images!")
                                return clean_answers
                    except Exception as e:
                        logger.warning(f"Gemini Vision OCR error with {model_name}: {e}. Trying next fallback...")

        # 2. Try OpenAI Vision Fallback
        openai_k = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        if (self.provider in ["auto", "openai"]) and openai_k:
            try:
                import httpx
                content_parts = [{"type": "text", "text": prompt}]
                for b64 in base64_images:
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"}
                    })

                headers = {
                    "Authorization": f"Bearer {openai_k}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": content_parts}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                }

                async with httpx.AsyncClient(timeout=60.0) as http_client:
                    resp = await http_client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw = data["choices"][0]["message"]["content"]
                        parsed = json.loads(raw)
                        answers = parsed.get("answers", [])
                        if answers:
                            logger.info(f"OpenAI Vision successfully extracted {len(answers)} handwritten answers!")
                            return answers
            except Exception as e:
                logger.error(f"OpenAI Vision extraction failed: {e}")

        return []

    async def extract_questions_from_vision(self, base64_images: List[str]) -> List[Dict[str, Any]]:
        """
        Multimodal Vision extraction for Staff Question Paper PDFs that contain scanned pages or images.
        Extracts questions, numbers, marks, topics, and key terms directly from the images.
        """
        if not base64_images:
            return []

        prompt = (
            "You are an expert examination processor.\n"
            "Analyze the attached Question Paper image(s).\n"
            "Extract all individual examination questions with their details:\n"
            "1. question_number (integer, e.g. 1, 2, 3...)\n"
            "2. question_text (complete clean question string)\n"
            "3. max_marks (float, e.g. 2.0 or detected marks)\n"
            "4. topic (broad technical subject area/module)\n\n"
            "Return ONLY a valid JSON object in this exact format:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "question_number": 1,\n'
            '      "question_text": "What is Artificial Intelligence? State its goal.",\n'
            '      "max_marks": 2.0,\n'
            '      "topic": "Artificial Intelligence Fundamentals"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        client = self._get_gemini_client()
        if (self.provider in ["auto", "gemini"]) and client:
            pil_images = []
            for b64 in base64_images:
                try:
                    img_bytes = base64.b64decode(b64)
                    pil_img = Image.open(io.BytesIO(img_bytes))
                    pil_images.append(pil_img)
                except Exception as e:
                    logger.warning(f"Could not decode image for QP extraction: {e}")

            if pil_images:
                contents = [*pil_images, prompt]
                for model_name in GEMINI_MODELS:
                    try:
                        logger.info(f"Extracting Question Paper via Vision LLM ({model_name})...")
                        response = client.models.generate_content(
                            model=model_name,
                            contents=contents
                        )
                        if response and response.text:
                            raw_text = response.text.strip()
                            if "```json" in raw_text:
                                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                            elif "```" in raw_text:
                                raw_text = raw_text.split("```")[1].split("```")[0].strip()

                            parsed = json.loads(raw_text)
                            questions = parsed.get("questions", [])
                            if questions:
                                logger.info(f"Successfully extracted {len(questions)} questions from Question Paper images!")
                                return questions
                    except Exception as e:
                        logger.warning(f"Vision Question Paper extraction error with {model_name}: {e}")

        return []

llm_provider = LLMProvider()
