from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from ..db import Base

class Organization(Base):
    __tablename__ = 'organizations'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default='recruiter')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    linkedin_profile_url: Mapped[Optional[str]] = mapped_column(String(255), default='')
    naukri_recruiter_id: Mapped[Optional[str]] = mapped_column(String(255), default='')
    indeed_employer_id: Mapped[Optional[str]] = mapped_column(String(255), default='')
    careers_page_url: Mapped[Optional[str]] = mapped_column(String(255), default='')

class Job(Base):
    __tablename__ = 'jobs'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    title: Mapped[str] = mapped_column(String(180))
    department: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(160))
    employment_type: Mapped[str] = mapped_column(String(40), default='Full-time')
    experience_level: Mapped[str] = mapped_column(String(60), default='Mid-level')
    skills: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[str] = mapped_column(String(30), default='draft')
    description: Mapped[str] = mapped_column(Text, default='')
    applicants: Mapped[int] = mapped_column(Integer, default=0)
    openings: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Candidate(Base):
    __tablename__ = 'candidates'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(160), default='')
    experience_level: Mapped[str] = mapped_column(String(60), default='Mid-level')
    skills: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[str] = mapped_column(String(40), default='Applied')
    source: Mapped[str] = mapped_column(String(60), default='Careers Portal')
    match_score: Mapped[int] = mapped_column(Integer, default=0)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Application(Base):
    __tablename__ = 'applications'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    job_id: Mapped[int] = mapped_column(ForeignKey('jobs.id'))
    candidate_id: Mapped[int] = mapped_column(ForeignKey('candidates.id'))
    assessment_id: Mapped[int] = mapped_column(ForeignKey('assessments.id'))
    status: Mapped[str] = mapped_column(String(40), default='Applied')
    match_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    match_explanation: Mapped[str] = mapped_column(Text, default='')
    assessment_token: Mapped[str] = mapped_column(String(120), default='')
    assessment_invited_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class Assessment(Base):
    __tablename__ = 'assessments'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    title: Mapped[str] = mapped_column(String(180))
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey('jobs.id'), nullable=True)
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[str] = mapped_column(String(30), default='draft')

class Interview(Base):
    __tablename__ = 'interviews'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    candidate_id: Mapped[int] = mapped_column(ForeignKey('candidates.id'))
    interviewer_name: Mapped[str] = mapped_column(String(120))
    interview_type: Mapped[str] = mapped_column(String(40), default='Video')
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30), default='Scheduled')
    meeting_link: Mapped[str] = mapped_column(String(500), default='')

class Offer(Base):
    __tablename__ = 'offers'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    candidate_id: Mapped[int] = mapped_column(ForeignKey('candidates.id'))
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey('jobs.id'), nullable=True)
    salary: Mapped[str] = mapped_column(String(80))
    joining_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default='Draft')
    letter_content: Mapped[str] = mapped_column(Text, default='')

class Resume(Base):
    __tablename__ = 'resumes'
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey('candidates.id'))
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    extracted_text: Mapped[str] = mapped_column(Text, default='')
    parsed_summary: Mapped[str] = mapped_column(Text, default='')
    storage_key: Mapped[str] = mapped_column(String(500), default='')
    storage_url: Mapped[str] = mapped_column(String(1000), default='')

class Question(Base):
    __tablename__ = 'questions'
    id: Mapped[int] = mapped_column(primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey('assessments.id'))
    prompt: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str] = mapped_column(String(30), default='MCQ')
    options: Mapped[str] = mapped_column(Text, default='')
    correct_answer: Mapped[str] = mapped_column(String(255), default='')
    explanation: Mapped[str] = mapped_column(Text, default='')

class AssessmentAttempt(Base):
    __tablename__ = 'assessment_attempts'
    id: Mapped[int] = mapped_column(primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey('assessments.id'))
    candidate_id: Mapped[int] = mapped_column(ForeignKey('candidates.id'))
    score: Mapped[int] = mapped_column(Integer, default=0)
    percentage: Mapped[int] = mapped_column(Integer, default=0)
    time_taken: Mapped[int] = mapped_column(Integer, default=0)

class InterviewFeedback(Base):
    __tablename__ = 'interview_feedback'
    id: Mapped[int] = mapped_column(primary_key=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey('interviews.id'))
    interviewer_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    technical_skills: Mapped[int] = mapped_column(Integer, default=0)
    communication: Mapped[int] = mapped_column(Integer, default=0)
    problem_solving: Mapped[int] = mapped_column(Integer, default=0)
    overall_rating: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[str] = mapped_column(Text, default='')
    recommendation: Mapped[str] = mapped_column(String(30), default='Maybe')

class HiringEvent(Base):
    __tablename__ = 'hiring_events'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    name: Mapped[str] = mapped_column(String(180))
    event_type: Mapped[str] = mapped_column(String(40), default='Virtual Hiring')
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey('jobs.id'), nullable=True)
    location: Mapped[str] = mapped_column(String(180), default='')
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    openings: Mapped[int] = mapped_column(Integer, default=1)

class Notification(Base):
    __tablename__ = 'notifications'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    title: Mapped[str] = mapped_column(String(180))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AIAnalysis(Base):
    __tablename__ = 'ai_analyses'
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id'))
    candidate_id: Mapped[Optional[int]] = mapped_column(ForeignKey('candidates.id'), nullable=True)
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey('jobs.id'), nullable=True)
    analysis_type: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
