from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization: str = 'Cbtshire.ai'

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    linkedin_profile_url: str | None = None
    naukri_recruiter_id: str | None = None
    indeed_employer_id: str | None = None
    careers_page_url: str | None = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    organization: str
    linkedin_profile_url: str = ''
    naukri_recruiter_id: str = ''
    indeed_employer_id: str = ''
    careers_page_url: str = ''

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

