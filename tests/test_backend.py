import pytest
import os
import sys

# Ensure backend directory is in pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.exam import Exam
from app.models.submission import Submission
from app.seed_data import init_seed_data
from app.ai.evaluator import ai_evaluator
from app.ai.question_extractor import question_extractor
from app.ai.rubric_generator import rubric_generator
from app.rag.retriever import rag_retriever

client = TestClient(app)

def setup_module():
    init_seed_data()

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_success():
    response = client.post("/api/auth/login", json={
        "email": "teacher@edueval.ai",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "teacher@edueval.ai"

def test_login_invalid_password():
    response = client.post("/api/auth/login", json={
        "email": "teacher@edueval.ai",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_get_exams():
    response = client.get("/api/exams")
    assert response.status_code == 200
    exams = response.json()
    assert len(exams) >= 1
    assert "AI Fundamentals" in exams[0]["name"]

def test_get_submissions():
    response = client.get("/api/submissions")
    assert response.status_code == 200
    subs = response.json()
    assert len(subs) >= 5
    # Verify rank 1 is Priya
    rank_1 = next((s for s in subs if s["register_number"] == "1021"), None)
    assert rank_1 is not None
    assert rank_1["percentage"] >= 90.0

def test_clerk_auth_sync():
    response = client.post(
        "/api/auth/clerk-sync",
        json={
            "email": "faculty.clerk@edueval.ai",
            "full_name": "Faculty Evaluator",
            "clerk_id": "user_clerk_test_12345",
            "role": "STAFF"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "faculty.clerk@edueval.ai"
    assert data["user"]["role"] == "STAFF"

@pytest.mark.asyncio
async def test_ai_evaluator_deterministic():
    criteria = [
        {"criterion": "simulation of human intelligence", "marks": 1.0},
        {"criterion": "machine learning and reasoning", "marks": 0.5},
        {"criterion": "practical applications and automation", "marks": 0.5}
    ]
    res = await ai_evaluator.evaluate_answer(
        question_text="What is Artificial Intelligence?",
        student_answer="AI is the simulation of human intelligence in machines for learning and reasoning tasks.",
        rubric_criteria=criteria,
        expected_answer="Simulation of human intelligence...",
        max_marks=2.0
    )
    assert res["marks_obtained"] >= 1.0
    assert res["marks_obtained"] <= 2.0
    assert res["confidence"] > 0.70
    assert "reason" in res

def test_export_pdf():
    # Fetch first exam
    db = SessionLocal()
    exam = db.query(Exam).first()
    db.close()
    
    response = client.get(f"/api/export/marks/{exam.id}/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"

def test_export_excel():
    db = SessionLocal()
    exam = db.query(Exam).first()
    db.close()
    
    response = client.get(f"/api/export/marks/{exam.id}/excel")
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
