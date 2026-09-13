import logging
from typing import Dict, Any, Optional
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store

logger = logging.getLogger(__name__)

class RAGRetriever:
    @staticmethod
    def retrieve_context_for_answer(exam_id: str, question_id: str, student_answer: str) -> Dict[str, Any]:
        """
        Retrieves matching question rubric, criteria, and expected answer using vector store.
        """
        query_vector = embedding_service.get_embedding(student_answer)
        
        # Primary lookup by exact question_id filter
        results = vector_store.similarity_search(
            query_vector,
            k=1,
            filter_metadata={"exam_id": exam_id, "question_id": question_id}
        )

        if results:
            match = results[0]
            return {
                "found": True,
                "similarity_score": match["score"],
                "context_text": match["text"],
                "metadata": match["metadata"]
            }

        # Fallback: search across all questions in the exam
        results_all = vector_store.similarity_search(
            query_vector,
            k=1,
            filter_metadata={"exam_id": exam_id}
        )

        if results_all:
            match = results_all[0]
            return {
                "found": True,
                "similarity_score": match["score"],
                "context_text": match["text"],
                "metadata": match["metadata"]
            }

        return {
            "found": False,
            "similarity_score": 0.0,
            "context_text": "",
            "metadata": {}
        }

rag_retriever = RAGRetriever()
