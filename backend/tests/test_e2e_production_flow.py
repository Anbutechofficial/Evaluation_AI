import asyncio
import io
import fitz  # PyMuPDF
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_sample_question_paper_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    text = (
        "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING\n"
        "END SEMESTER EXAMINATION 2026\n"
        "COURSE: ARTIFICIAL INTELLIGENCE & MACHINE LEARNING\n"
        "Duration: 90 Minutes               Max Marks: 20\n\n"
        "PART - A (Answer All Questions)\n\n"
        "1. What is Artificial Intelligence? State its primary goal. (2 Marks)\n\n"
        "2. Define Supervised Learning with a real-world example. (2 Marks)\n\n"
    )
    page.insert_text((50, 72), text, fontsize=11)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    buf.seek(0)
    return buf.read()

def create_sample_student_answer_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    text = (
        "STUDENT ANSWER SHEET\n"
        "REGISTER NUMBER: 717822P101\n"
        "STUDENT NAME: John Doe\n\n"
        "Ans 1.\n"
        "Artificial Intelligence is the simulation of human intelligence by machines to perform reasoning, problem solving, and autonomous tasks.\n\n"
        "Ans 2.\n"
        "Supervised learning is a machine learning technique using labeled data to train models, for example email spam classification.\n\n"
    )
    page.insert_text((50, 72), text, fontsize=11)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    buf.seek(0)
    return buf.read()

def test_full_production_workflow():
    print("\n--- STEP 1: Staff Authentication ---")
    login_resp = client.post("/api/auth/login", json={"email": "teacher@edueval.ai", "password": "password123"})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("Staff logged in successfully. Token acquired.")

    print("\n--- STEP 2: Create Exam & Upload Question Paper PDF ---")
    qp_pdf_bytes = create_sample_question_paper_pdf()
    files = {"file": ("Sample_QP.pdf", qp_pdf_bytes, "application/pdf")}
    data = {
        "name": "E2E Production Examination 2026",
        "subject": "CS8691 Artificial Intelligence",
        "class_name": "IV Year CSE",
        "department": "Computer Science & Engineering",
        "duration_minutes": 90
    }
    create_resp = client.post("/api/exams/create-with-question-paper", data=data, files=files, headers=auth_headers)
    assert create_resp.status_code == 200, f"Create exam failed: {create_resp.text}"
    exam = create_resp.json()
    exam_id = exam["id"]
    print(f"Exam created successfully: ID={exam_id}, Status={exam['status']}, Total Marks={exam['total_marks']}")

    print("\n--- STEP 3: Verify Extracted Questions, Model Answers & Keywords ---")
    q_resp = client.get(f"/api/questions/exam/{exam_id}", headers=auth_headers)
    assert q_resp.status_code == 200
    questions = q_resp.json()
    print(f"Total Extracted Questions: {len(questions)}")
    for q in questions:
        print(f"\nQ{q['question_number']}: {q['question_text']} ({q['max_marks']}m)")
        print(f"  Keywords ({len(q['keywords'])}): {q['keywords']}")
        if q.get('rubric'):
            print(f"  Model Answer: {q['rubric'].get('model_answer')}")
            print(f"  Criteria ({len(q['rubric'].get('criteria', []))} items): {q['rubric'].get('criteria')}")

    assert len(questions) >= 2, "Expected at least 2 extracted questions"

    print("\n--- STEP 4: Staff Publishes Examination ---")
    pub_resp = client.post(f"/api/exams/{exam_id}/publish", headers=auth_headers)
    assert pub_resp.status_code == 200
    pub_exam = pub_resp.json()
    assert pub_exam["status"] == "PUBLISHED"
    print(f"Exam status updated to: {pub_exam['status']}")

    # Verify student can see published exam
    published_list = client.get("/api/exams/published").json()
    assert any(e["id"] == exam_id for e in published_list), "Exam not found in published list"
    print(f"Exam verified visible to students in /api/exams/published.")

    print("\n--- STEP 5: Student Submits Answer Sheet PDF ---")
    ans_pdf_bytes = create_sample_student_answer_pdf()
    student_files = {"file": ("John_Doe_717822P101.pdf", ans_pdf_bytes, "application/pdf")}
    student_data = {
        "exam_id": exam_id,
        "student_name": "John Doe",
        "register_number": "717822P101",
        "class_name": "IV Year CSE",
        "department": "Computer Science & Engineering"
    }
    sub_resp = client.post("/api/submissions", data=student_data, files=student_files)
    assert sub_resp.status_code == 200, f"Student submission failed: {sub_resp.text}"
    sub_result = sub_resp.json()

    print("\n--- STEP 6: Verify Evaluation Results & Keyword Matching ---")
    print(f"Student: {sub_result['student_name']} ({sub_result['register_number']})")
    print(f"Total Score: {sub_result['total_score']} / {sub_result['max_score']} ({sub_result['percentage']}%)")
    print(f"Submission Status: {sub_result['status']}")

    evaluations = sub_result.get("evaluations", [])
    print(f"Total Evaluations: {len(evaluations)}")
    for ev in evaluations:
        print(f"\n[Q{ev.get('question_number')}] Score: {ev.get('marks_obtained')} / {ev.get('max_marks')} Marks")
        print(f"  Student Extracted Text: {ev.get('student_answer_text')}")
        print(f"  Model Answer: {ev.get('model_answer')}")
        print(f"  Matched Keywords: {ev.get('matched_keywords')}")
        print(f"  Missing Keywords: {ev.get('missing_keywords')}")
        print(f"  Match Rate: {ev.get('keyword_match_percentage')}%")
        print(f"  AI Reason: {ev.get('reason')}")
        print(f"  Feedback: {ev.get('feedback')}")

    assert sub_result["total_score"] > 0, "Total score should be > 0"
    print("\n=======================================================")
    print("SUCCESS: End-to-End Production Flow Passed 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_full_production_workflow()
