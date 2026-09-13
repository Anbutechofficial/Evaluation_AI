import logging
from typing import List, Dict, Any
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store

logger = logging.getLogger(__name__)

class RAGIngestionService:
    @staticmethod
    def ingest_exam_knowledge(exam_id: str, questions_data: List[Dict[str, Any]]):
        """
        Indexes all exam questions, keywords, expected answers, and rubric criteria into vector store.
        """
        # Clear existing entries for this exam to ensure fresh index
        vector_store.delete_by_exam_id(exam_id)

        for q in questions_data:
            q_id = q.get("id") or str(q.get("question_number"))
            q_num = q.get("question_number", 1)
            q_text = q.get("question_text", "")
            topic = q.get("topic", "General")
            rubric = q.get("rubric", {})
            criteria = rubric.get("criteria", []) if rubric else []
            expected_answer = rubric.get("expected_answer", "") if rubric else ""
            model_answer = rubric.get("model_answer", "") if rubric else ""

            # Prepare structured knowledge document
            criteria_str = "\n".join([f"- {c.get('criterion')} ({c.get('marks')} marks)" for c in criteria])
            knowledge_text = (
                f"Question {q_num}: {q_text}\n"
                f"Topic: {topic}\n"
                f"Benchmark Model Answer: {model_answer or expected_answer}\n"
                f"Grading Criteria:\n{criteria_str}"
            )

            vector = embedding_service.get_embedding(knowledge_text)

            metadata = {
                "exam_id": exam_id,
                "question_id": q_id,
                "question_number": q_num,
                "question_text": q_text,
                "topic": topic,
                "max_marks": q.get("max_marks", 2.0),
                "criteria": criteria,
                "expected_answer": expected_answer,
                "model_answer": model_answer
            }

            doc_id = f"{exam_id}_q_{q_num}_{q_id}"
            vector_store.add_document(doc_id, knowledge_text, vector, metadata)

        logger.info(f"Successfully ingested {len(questions_data)} questions into Vector Store for Exam {exam_id}")

rag_ingestion = RAGIngestionService()
