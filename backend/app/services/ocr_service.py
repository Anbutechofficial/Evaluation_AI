import logging
import os
import io
import base64
from typing import Dict, Any, List
from PIL import Image, ImageEnhance, ImageFilter
from app.ai.llm_provider import llm_provider

logger = logging.getLogger(__name__)

class OCRService:
    @staticmethod
    def preprocess_image(pil_img: Image.Image) -> Image.Image:
        """
        Enhances handwritten examination paper images for optimal OCR & Vision recognition.
        Converts to RGB, boosts contrast, and sharpens ink strokes.
        """
        try:
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
            # Boost contrast slightly to make pencil/ink strokes distinct
            enhancer = ImageEnhance.Contrast(pil_img)
            img = enhancer.enhance(1.3)
            # Boost sharpness
            sharpener = ImageEnhance.Sharpness(img)
            img = sharpener.enhance(1.2)
            return img
        except Exception as e:
            logger.warning(f"Image preprocessing note: {e}")
            return pil_img

    @staticmethod
    def render_pdf_to_base64_images(file_path: str, max_pages: int = 10, dpi: int = 200) -> List[str]:
        """
        Renders PDF pages into high-resolution PNG images with contrast preprocessing and encodes as base64 strings.
        """
        base64_images = []
        try:
            import pymupdf as fitz
            doc = fitz.open(file_path)
            for page_num in range(min(len(doc), max_pages)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=dpi)
                img_bytes = pix.tobytes("png")
                
                # Preprocess image
                pil_img = Image.open(io.BytesIO(img_bytes))
                enhanced_img = OCRService.preprocess_image(pil_img)
                
                out_buf = io.BytesIO()
                enhanced_img.save(out_buf, format="PNG")
                b64_str = base64.b64encode(out_buf.getvalue()).decode("utf-8")
                base64_images.append(b64_str)
            doc.close()
        except Exception as e:
            logger.error(f"Error rendering PDF to images: {e}")
        return base64_images

    @staticmethod
    async def process_image_or_scanned_pdf(file_path: str, questions_metadata: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Processes scanned or handwritten PDF answer sheets using Multimodal Vision LLM.
        1. Renders PDF pages to high-res, enhanced images.
        2. Executes Vision-based Multimodal OCR via Gemini Vision.
        3. Falls back to RapidOCR / PyMuPDF if needed.
        """
        extracted_text = ""
        structured_answers = []
        is_ocr_applied = False
        confidence = 0.92

        # 1. Render PDF to images
        b64_images = OCRService.render_pdf_to_base64_images(file_path, max_pages=10, dpi=200)

        # 2. Try Multimodal Vision LLM OCR (Optimal for handwritten examination scripts)
        if b64_images and llm_provider.is_available():
            logger.info("Executing Multimodal Vision OCR via Gemini for student answer sheet images...")
            vision_answers = await llm_provider.extract_handwritten_pages_vision(b64_images, questions_metadata)
            if vision_answers:
                structured_answers = vision_answers
                text_blocks = []
                for a in vision_answers:
                    q_num = a.get("question_number")
                    ans_text = a.get("answer_text", "").strip()
                    if q_num and ans_text:
                        text_blocks.append(f"Question {q_num}:\n{ans_text}")
                extracted_text = "\n\n".join(text_blocks)
                is_ocr_applied = True
                confidence = 0.95
                return {
                    "text": extracted_text,
                    "structured_answers": structured_answers,
                    "is_ocr_applied": is_ocr_applied,
                    "ocr_confidence": confidence
                }

        # 3. Fallback: RapidOCR ONNX Local OCR
        if not extracted_text.strip():
            try:
                from rapidocr_onnxruntime import RapidOCR
                rapid_engine = RapidOCR()
                import pymupdf as fitz
                doc = fitz.open(file_path)
                ocr_lines = []
                for page in doc:
                    pix = page.get_pixmap(dpi=200)
                    img_bytes = pix.tobytes("png")
                    result, _ = rapid_engine(img_bytes)
                    if result:
                        for line in result:
                            if len(line) > 1 and line[1].strip():
                                ocr_lines.append(line[1].strip())
                doc.close()
                if ocr_lines:
                    extracted_text = "\n".join(ocr_lines)
                    is_ocr_applied = True
                    confidence = 0.88
                    logger.info(f"RapidOCR fallback extracted {len(ocr_lines)} text lines from PDF.")
            except Exception as e:
                logger.info(f"RapidOCR fallback note: {e}")

        # 4. Fallback: Secondary PyMuPDF text block extraction
        if not extracted_text.strip():
            try:
                import pymupdf as fitz
                doc = fitz.open(file_path)
                for page in doc:
                    blocks = page.get_text("blocks")
                    for b in blocks:
                        if len(b) > 4 and b[4].strip():
                            extracted_text += b[4] + "\n"
                doc.close()
                if extracted_text.strip():
                    is_ocr_applied = True
            except Exception as e:
                logger.warning(f"Text block extraction note: {e}")

        return {
            "text": extracted_text.strip(),
            "structured_answers": structured_answers,
            "is_ocr_applied": is_ocr_applied,
            "ocr_confidence": confidence
        }

    @staticmethod
    async def process_question_paper_images(file_path: str) -> List[Dict[str, Any]]:
        """
        Renders Question Paper PDF to images and extracts structured questions via Vision LLM.
        """
        b64_images = OCRService.render_pdf_to_base64_images(file_path, max_pages=10, dpi=200)
        if b64_images and llm_provider.is_available():
            logger.info("Executing Multimodal Vision Question Paper extraction...")
            questions = await llm_provider.extract_questions_from_vision(b64_images)
            if questions:
                return questions
        return []

ocr_service = OCRService()
