import asyncio
import logging
from app.database import SessionLocal
from app.models.submission import Submission, StudentAnswer
from app.models.evaluation import Evaluation
from app.graph.workflow import evaluation_workflow

logging.basicConfig(level=logging.INFO)

async def test_evaluate_handwritten_sheet():
    db = SessionLocal()
    try:
        # Find the submission with 0 marks
        sub = db.query(Submission).filter(
            Submission.file_path.like("%fef8dbcccdfb%")
        ).first()

        if not sub:
            print("Submission not found in DB, picking the latest 0.0 score submission...")
            sub = db.query(Submission).filter(Submission.total_score == 0.0).first()

        assert sub is not None, "No submission found to evaluate"
        print(f"Testing evaluation for submission: {sub.id}, Student: {sub.student_name}, Reg: {sub.register_number}")
        print(f"File: {sub.file_path}")

        # Run the updated LangGraph workflow
        result = await evaluation_workflow.run_evaluation(
            exam_id=sub.exam_id,
            submission_id=sub.id,
            db=db
        )

        print("\nEvaluation Workflow Result:")
        print(result)

        db.refresh(sub)
        print(f"\nUpdated Submission Status: {sub.status}")
        print(f"Total Score: {sub.total_score} / {sub.max_score} ({sub.percentage}%)")

        evals = db.query(Evaluation).filter(Evaluation.submission_id == sub.id).all()
        print(f"\nQuestion Evaluations Count: {len(evals)}")
        for e in evals:
            print(f"Q {e.question_id[:8]}... | Marks: {e.marks_obtained}/{e.max_marks} | Confidence: {e.confidence} | Reason: {e.reason[:70]}...")

        # Assert marks are greater than 0
        assert sub.total_score > 0.0, f"Expected total_score > 0, got {sub.total_score}"
        print("\nSUCCESS: Handwritten answer sheet evaluated with score > 0!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_evaluate_handwritten_sheet())
