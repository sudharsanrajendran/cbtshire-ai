import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Organization, User
from ..schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerifyOtpRequest,
)
from ..utils.security import create_access_token, hash_password, verify_password
from ..dependencies.auth import current_user

router = APIRouter(prefix='/auth', tags=['auth'])
def response_user(user: User, organization: str) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        organization=organization,
        linkedin_profile_url=user.linkedin_profile_url or '',
        naukri_recruiter_id=user.naukri_recruiter_id or '',
        indeed_employer_id=user.indeed_employer_id or '',
        careers_page_url=user.careers_page_url or ''
    )

@router.post('/register', response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)): raise HTTPException(409, 'Email is already registered')
    organization = Organization(name=payload.organization); db.add(organization); db.flush()
    user = User(organization_id=organization.id, name=payload.name, email=payload.email, password_hash=hash_password(payload.password), role='admin'); db.add(user); db.commit(); db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)), user=response_user(user, organization.name))

@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(401, 'Incorrect email or password')
    organization = db.get(Organization, user.organization_id)
    return TokenResponse(access_token=create_access_token(str(user.id)), user=response_user(user, organization.name if organization else 'Cbtshire.ai'))

@router.get('/me', response_model=UserResponse)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    organization = db.get(Organization, user.organization_id)
    return response_user(user, organization.name if organization else 'Cbtshire.ai')

@router.put('/profile', response_model=UserResponse)
def update_profile(payload: ProfileUpdateRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.linkedin_profile_url is not None:
        user.linkedin_profile_url = payload.linkedin_profile_url.strip()
    if payload.naukri_recruiter_id is not None:
        user.naukri_recruiter_id = payload.naukri_recruiter_id.strip()
    if payload.indeed_employer_id is not None:
        user.indeed_employer_id = payload.indeed_employer_id.strip()
    if payload.careers_page_url is not None:
        user.careers_page_url = payload.careers_page_url.strip()

    db.commit()
    db.refresh(user)
    organization = db.get(Organization, user.organization_id)
    return response_user(user, organization.name if organization else 'Cbtshire.ai')

RESET_CODES: dict[str, str] = {}

@router.post('/forgot-password')
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(404, 'No account found with this email address')
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    RESET_CODES[payload.email] = otp

    from ..services.email import send_password_reset_email
    email_sent = send_password_reset_email(user.email, user.name, otp)

    msg = f'6-digit password reset OTP has been dispatched to {user.email}'
    if not email_sent:
        msg = f'OTP code generated: {otp} (Email delivery not configured in dev mode)'
    else:
        msg = f'6-digit password reset OTP has been sent to {user.email}. (Demo Code: {otp})'

    return {
        'success': True,
        'email': user.email,
        'email_sent': email_sent,
        'otp': otp,
        'message': msg
    }

@router.post('/verify-otp')
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    stored_otp = RESET_CODES.get(payload.email)
    if not stored_otp or stored_otp != payload.otp:
        raise HTTPException(400, 'Invalid or expired 6-digit OTP code')
    return {
        'success': True,
        'message': 'OTP verified successfully! Please set your new password.'
    }

@router.post('/reset-password')
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    stored_otp = RESET_CODES.get(payload.email)
    if not stored_otp or stored_otp != payload.otp:
        raise HTTPException(400, 'Invalid or expired 6-digit OTP code')

    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(404, 'User not found')

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    # Clear OTP code
    RESET_CODES.pop(payload.email, None)

    return {
        'success': True,
        'message': 'Password has been updated successfully! You can now sign in with your new password.'
    }

