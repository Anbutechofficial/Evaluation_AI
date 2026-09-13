import pymupdf as fitz
import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PDFService:
    @staticmethod
    def extract_text(file_path: str) -> Dict[str, Any]:
        """
        Extracts text from a PDF file using PyMuPDF.
        Accurately detects embedded images, scanned pages, or sparse text requiring OCR / Vision LLM.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at {file_path}")

        try:
            doc = fitz.open(file_path)
            full_text = []
            page_texts = []
            has_images = False
            total_chars = 0
            num_pages = len(doc)

            for page_num in range(num_pages):
                page = doc[page_num]
                text = page.get_text("text").strip()
                page_texts.append(text)
                if text:
                    full_text.append(text)
                    total_chars += len(text)
                
                # Check if page contains embedded raster images
                images = page.get_images()
                if images and len(images) > 0:
                    has_images = True

            combined_text = "\n\n".join(full_text).strip()
            doc.close()

            # Mark for OCR / Multimodal Vision if:
            # 1. Page contains images
            # 2. Text density is low (< 60 chars per page on average)
            # 3. Overall text is virtually empty (< 40 characters)
            needs_ocr = has_images or (total_chars < (60 * max(1, num_pages))) or (total_chars < 40)

            return {
                "text": combined_text,
                "page_texts": page_texts,
                "num_pages": num_pages,
                "total_chars": total_chars,
                "has_images": has_images,
                "needs_ocr": needs_ocr,
                "is_empty": (total_chars == 0 and not has_images)
            }

        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            raise RuntimeError(f"Failed to process PDF: {str(e)}")

pdf_service = PDFService()
