import numpy as np
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class VectorDocument:
    def __init__(self, doc_id: str, text: str, vector: List[float], metadata: Dict[str, Any]):
        self.doc_id = doc_id
        self.text = text
        self.vector = np.array(vector, dtype=np.float32)
        self.metadata = metadata

class VectorStore:
    def __init__(self):
        self.documents: Dict[str, VectorDocument] = {}

    def add_document(self, doc_id: str, text: str, vector: List[float], metadata: Dict[str, Any]):
        self.documents[doc_id] = VectorDocument(doc_id, text, vector, metadata)

    def delete_by_exam_id(self, exam_id: str):
        keys_to_delete = [
            k for k, doc in self.documents.items()
            if doc.metadata.get("exam_id") == exam_id
        ]
        for k in keys_to_delete:
            del self.documents[k]

    def similarity_search(self, query_vector: List[float], k: int = 3, filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.documents:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        scored_docs = []
        for doc in self.documents.values():
            # Check metadata filters
            if filter_metadata:
                match = True
                for key, val in filter_metadata.items():
                    if doc.metadata.get(key) != val:
                        match = False
                        break
                if not match:
                    continue

            d_vec = doc.vector
            d_norm = np.linalg.norm(d_vec)
            if d_norm > 0:
                d_vec = d_vec / d_norm
            
            # Cosine similarity
            score = float(np.dot(q_vec, d_vec))
            scored_docs.append({
                "doc_id": doc.doc_id,
                "text": doc.text,
                "score": score,
                "metadata": doc.metadata
            })

        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:k]

vector_store = VectorStore()
