from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.exams import router as exams_router
from app.api.questions import router as questions_router
from app.api.submissions import router as submissions_router
from app.api.evaluations import router as evaluations_router
from app.api.export import router as export_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(exams_router)
api_router.include_router(questions_router)
api_router.include_router(submissions_router)
api_router.include_router(evaluations_router)
api_router.include_router(export_router)
