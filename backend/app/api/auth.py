from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse, ClerkAuthSync
from app.utils.security import verify_password, get_password_hash, create_access_token, require_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/clerk-sync", response_model=TokenResponse)
def clerk_sync(payload: ClerkAuthSync, db: Session = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=clean_email,
            hashed_password=get_password_hash(f"clerk_oauth_{uuid.uuid4()}"),
            full_name=payload.full_name or "Staff Member",
            role=payload.role or "STAFF"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if payload.full_name and user.full_name != payload.full_name:
            user.full_name = payload.full_name
            db.commit()
            db.refresh(user)
            
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=TokenResponse)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")
    
    user = User(
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_profile(current_user: User = Depends(require_current_user)):
    return UserResponse.model_validate(current_user)
