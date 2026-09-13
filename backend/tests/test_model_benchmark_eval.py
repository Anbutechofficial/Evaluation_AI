import asyncio
import logging
from app.ai.evaluator import ai_evaluator

logging.basicConfig(level=logging.INFO)

async def test_model_answer_evaluation():
    question_text = "What is Artificial Intelligence? State its goal."
    model_answer = (
        "Artificial Intelligence (AI) is the simulation of human intelligence processes by machines "
        "and computer systems. Its primary goal is to develop intelligent agents capable of "
        "human-like reasoning, continuous learning, problem solving, and autonomous decision making."
    )
    student_good_answer = (
        "Artificial Intelligence refers to computer systems that simulate human intelligence. "
        "The main objective is to build smart machines that can learn from data, reason, and solve problems independently."
    )
    student_poor_answer = "It is computers."

    rubric_criteria = [
        {"criterion": "Precise definition of AI as machine simulation of human intelligence", "marks": 1.0},
        {"criterion": "Goal of developing intelligent reasoning, learning, and problem-solving systems", "marks": 1.0}
    ]

    print("\n--- Testing Good Student Answer vs Model Benchmark ---")
    good_eval = await ai_evaluator.evaluate_answer(
        question_text=question_text,
        student_answer=student_good_answer,
        rubric_criteria=rubric_criteria,
        max_marks=2.0,
        model_answer=model_answer
    )
    print("Good Answer Result:")
    print(f"Marks: {good_eval.get('marks_obtained')} / 2.0")
    print(f"Model Alignment Score: {good_eval.get('model_alignment_score')}%")
    print(f"Reason: {good_eval.get('reason')}")
    print(f"Feedback: {good_eval.get('feedback')}")

    assert good_eval.get("marks_obtained") >= 1.5, f"Expected >= 1.5, got {good_eval.get('marks_obtained')}"
    assert good_eval.get("model_alignment_score") >= 70, f"Expected >= 70, got {good_eval.get('model_alignment_score')}"

    print("\n--- Testing Poor Student Answer vs Model Benchmark ---")
    poor_eval = await ai_evaluator.evaluate_answer(
        question_text=question_text,
        student_answer=student_poor_answer,
        rubric_criteria=rubric_criteria,
        max_marks=2.0,
        model_answer=model_answer
    )
    print("Poor Answer Result:")
    print(f"Marks: {poor_eval.get('marks_obtained')} / 2.0")
    print(f"Model Alignment Score: {poor_eval.get('model_alignment_score')}%")
    print(f"Reason: {poor_eval.get('reason')}")

    assert poor_eval.get("marks_obtained") < 1.0, f"Expected < 1.0, got {poor_eval.get('marks_obtained')}"
    assert poor_eval.get("model_alignment_score") < 60, f"Expected < 60, got {poor_eval.get('model_alignment_score')}"

    print("\nALL BENCHMARK MODEL EVALUATION TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_model_answer_evaluation())
