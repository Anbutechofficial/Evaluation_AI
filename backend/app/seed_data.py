import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.exam import Exam, QuestionPaper
from app.models.question import Question
from app.models.rubric import Rubric
from app.models.submission import Submission, StudentAnswer
from app.models.evaluation import Evaluation, TeacherReview
from app.utils.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_data")

def purge_mock_data(db: Session = None):
    """Purges all demo/mock examinations, questions, submissions, and evaluations."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        logger.info("Purging legacy mock examinations, questions, and submissions...")
        db.query(TeacherReview).delete()
        db.query(Evaluation).delete()
        db.query(StudentAnswer).delete()
        db.query(Submission).delete()
        db.query(Rubric).delete()
        db.query(Question).delete()
        db.query(QuestionPaper).delete()
        db.query(Exam).delete()
        db.commit()
        logger.info("Database successfully purged of all mock data. Ready for production usage.")
    except Exception as e:
        logger.error(f"Error purging mock data: {e}", exc_info=True)
        db.rollback()
    finally:
        if close_db:
            db.close()

def init_seed_data(purge_mock: bool = False):
    """
    Initializes DB tables and ensures essential system accounts exist.
    Does NOT seed fake mock questions or dummy student submissions.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Ensure Staff User
        for email, name in [
            ("teacher@edueval.ai", "Prof. Sarah Jenkins"),
            ("staff@edueval.ai", "Examination Staff"),
            ("anbutechofficial@gmail.com", "ANBARASU P")
        ]:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=get_password_hash("password123"),
                    full_name=name,
                    role=UserRole.STAFF.value
                )
                db.add(user)
                logger.info(f"Created staff user: {email} / password123")

        # 2. Ensure Student User
        student_user = db.query(User).filter(User.email == "student@edueval.ai").first()
        if not student_user:
            student_user = User(
                email="student@edueval.ai",
                hashed_password=get_password_hash("password123"),
                full_name="Student Candidate",
                role=UserRole.STUDENT.value
            )
            db.add(student_user)
            logger.info("Created student user: student@edueval.ai / password123")

        db.commit()

        if purge_mock:
            purge_mock_data(db)

        logger.info("Production system base initialization completed.")

    except Exception as e:
        logger.error(f"Error initializing system users: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    purge_mock_data()
    init_seed_data()
