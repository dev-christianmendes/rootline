from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.auth.security import create_access_token, verify_password, get_password_hash
from app.auth.schemas import LoginRequest, Token, User, UserCreate, UserInDB
from app.db import get_db
from app.models import User as UserModel
from app.rate_limiter import rate_limit, AUTH_RATE_LIMIT

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token, dependencies=[rate_limit(AUTH_RATE_LIMIT)])
def login(
    form_data: LoginRequest,
    db: Session = Depends(get_db),
) -> Token:
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    access_token = create_access_token(subject=user.username)
    return Token(access_token=access_token, expires_in=60 * 60 * 24 * 7)


@router.get("/me", response_model=User)
def read_users_me(
    current_user: UserModel = Depends(get_current_active_user),
) -> UserModel:
    return current_user


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED, dependencies=[rate_limit(AUTH_RATE_LIMIT)])
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> UserModel:
    existing = db.query(UserModel).filter(
        (UserModel.username == user_in.username) | (UserModel.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    user = UserModel(
        id=f"usr-{user_in.username}",
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user