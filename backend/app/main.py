import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.api import api_router
from app.seed_data import init_seed_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edueval")
START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Evaluation AI Database and Tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Initializing system base configurations...")
    init_seed_data()
    logger.info("Evaluation AI Evaluation Backend active.")
    yield
    logger.info("Evaluation AI Backend gracefully shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic RAG-Based Intelligent Answer Evaluation System API",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Unhandled Exception Handler Shield
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred while processing your request.",
            "path": request.url.path
        }
    )

# Include all API routes
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/health")
def health_check():
    db_status = "healthy"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "uptime_seconds": round(time.time() - START_TIME, 1)
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to Evaluation AI API",
        "docs_url": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8015, reload=True)
