import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from dotenv import load_dotenv

# Load .env from current directory or parent directory
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

class Settings(BaseSettings):
    PROJECT_NAME: str = "Evaluation AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "edueval_ai_super_secret_jwt_key_2026_production_grade")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edueval.db")
    
    # Storage
    UPLOAD_DIR: str = os.path.join(os.getcwd(), "data", "uploads")
    EXPORT_DIR: str = os.path.join(os.getcwd(), "data", "exports")
    
    # AI & RAG Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "auto") # auto, openai, gemini, heuristic
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    VECTOR_DB_TYPE: str = os.getenv("VECTOR_DB_TYPE", "in_memory") # in_memory, faiss, qdrant
    
    # Evaluation
    CONFIDENCE_THRESHOLD: float = 0.70  # Below this, flag for manual review
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "question_papers"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "answer_sheets"), exist_ok=True)
