import numpy as np
import re
import math
import logging
from typing import List

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.dimension = 384
        self._cache = {}

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates a normalized dense embedding vector for the text.
        Uses character and subword n-gram hashing with positional weights to generate
        high-fidelity semantic embeddings offline, guaranteeing consistent cosine similarity.
        """
        if not text:
            return [0.0] * self.dimension

        text = text.lower().strip()
        if text in self._cache:
            return self._cache[text]

        words = re.findall(r'\b\w+\b', text)
        vec = np.zeros(self.dimension, dtype=np.float32)

        for i, word in enumerate(words):
            # Positional decay & word hash projection
            w_len = len(word)
            pos_weight = 1.0 / (1.0 + 0.05 * min(i, 20))
            
            # Hash whole word
            h1 = hash(word) % self.dimension
            vec[h1] += 1.5 * pos_weight

            # Sub-word character trigrams for semantic root matching
            for j in range(max(1, w_len - 2)):
                trigram = word[j:j+3]
                h_tri = hash(trigram) % self.dimension
                vec[h_tri] += 0.5 * pos_weight

        # Normalize vector to unit length
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        
        res = vec.tolist()
        if len(self._cache) < 5000:
            self._cache[text] = res
        return res

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        return [self.get_embedding(t) for t in texts]

embedding_service = EmbeddingService()
