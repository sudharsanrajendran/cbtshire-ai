from datetime import datetime
from secrets import token_urlsafe
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..config import get_settings
from ..db import SessionLocal
from ..models import Application, Assessment, AssessmentAttempt, Candidate, Job, Notification, Question, Resume, User
from ..services.ai.resume_analyzer import analyze_resume
from ..services.email import send_assessment_invite
from ..services.storage import CloudStorage
from .advanced import extract_resume_text

router = APIRouter(prefix='/public', tags=['public'])
ALLOWED = {'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}

@router.get('/jobs/{job_id}')
def public_job(job_id: int):
    with SessionLocal() as db:
        job = db.scalar(select(Job).where(Job.id == job_id, Job.status == 'published'))
        if not job: raise HTTPException(404, 'Published job not found')
        return {'id': job.id, 'title': job.title, 'department': job.department, 'location': job.location, 'experience_level': job.experience_level, 'skills': [item for item in job.skills.split(',') if item], 'description': job.description}

@router.post('/jobs/{job_id}/apply')
async def apply(job_id: int, name: str = Form(...), email: str = Form(...), phone: str = Form(''), file: UploadFile = File(...)):
    if file.content_type not in ALLOWED: raise HTTPException(415, 'Resume must be PDF, DOC, or DOCX')
    content = await file.read()
    if len(content) > 5 * 1024 * 1024: raise HTTPException(413, 'Resume must be 5 MB or smaller')
    with SessionLocal() as db:
        job = db.scalar(select(Job).where(Job.id == job_id, Job.status == 'published'))
        if not job: raise HTTPException(404, 'Published job not found')
        candidate = Candidate(organization_id=job.organization_id, name=name, email=email, role=job.title, status='Screening')
        db.add(candidate); db.flush()
        try: storage_key, storage_url = CloudStorage().upload(content, file.filename or 'resume', file.content_type)
        except RuntimeError as error: raise HTTPException(503, str(error)) from error
        extracted = extract_resume_text(content, file.content_type)
        analysis = await analyze_resume(extracted)
        db.add(Resume(candidate_id=candidate.id, filename=file.filename or 'resume', content_type=file.content_type, extracted_text=extracted, parsed_summary=analysis, storage_key=storage_key, storage_url=storage_url))
        assessment = db.scalar(select(Assessment).where(Assessment.organization_id == job.organization_id).order_by(Assessment.id.desc()))
        if not assessment:
            assessment = Assessment(organization_id=job.organization_id, title=f'{job.title} screening', job_id=job.id, question_count=0, duration_minutes=30, status='published'); db.add(assessment); db.flush()
        owner = db.scalar(select(User).where(User.organization_id == job.organization_id).order_by(User.id))
        application = Application(organization_id=job.organization_id, job_id=job.id, candidate_id=candidate.id, assessment_id=assessment.id, match_explanation=analysis, assessment_token=token_urlsafe(32), assessment_invited_at=datetime.utcnow())
        db.add(application)
        if owner: db.add(Notification(user_id=owner.id, title='New candidate application', message=f'{name} applied for {job.title}.'))
        db.commit()
        link = f"{get_settings().public_app_url}/assessment/{application.assessment_token}"
        emailed = send_assessment_invite(email, name, job.title, link)
        return {'application_id': application.id, 'candidate_id': candidate.id, 'assessment_link': link, 'email_sent': emailed, 'ai_summary': analysis, 'review_required': True}

@router.get('/assessments/{token}')
def public_assessment(token: str):
    with SessionLocal() as db:
        application = db.scalar(select(Application).where(Application.assessment_token == token))
        if not application:
            candidate = db.scalar(select(Candidate).order_by(Candidate.id.desc()))
            if not candidate:
                candidate = Candidate(organization_id=1, name='Demo Candidate', email='demo.candidate@example.com', role='Software Engineer', status='Assessment')
                db.add(candidate)
                db.flush()
            job = db.scalar(select(Job).order_by(Job.id.desc()))
            assessment = Assessment(organization_id=1, title=f"{job.title if job else 'Technical'} Screening", job_id=job.id if job else 1, question_count=5, duration_minutes=30, status='published')
            db.add(assessment)
            db.flush()
            application = Application(
                organization_id=1,
                job_id=job.id if job else 1,
                candidate_id=candidate.id,
                assessment_id=assessment.id,
                status='Assessment',
                match_explanation='Automated screening application.',
                assessment_token=token,
                assessment_invited_at=datetime.utcnow()
            )
            db.add(application)
            db.commit()
            db.refresh(application)

        assessment = db.get(Assessment, application.assessment_id)
        questions = db.scalars(select(Question).where(Question.assessment_id == assessment.id)).all() if assessment else []
        if assessment and not questions:
            job = db.get(Job, application.job_id) if application.job_id else None
            job_title = job.title if job else 'Technical Specialist'
            skills = job.skills if job and job.skills else 'Software Engineering, Problem Solving'
            sample_questions = [
                {
                    'prompt': f'Which core technical concept is most critical for a {job_title} role?',
                    'options': f'{skills.split(",")[0] if skills else "Core Tech"}|Legacy Systems|Unrelated Skills|Manual Overhead',
                    'correct': skills.split(',')[0] if skills else 'Core Tech',
                    'exp': 'Assesses fundamental domain skill relevant to job requirements.'
                },
                {
                    'prompt': 'How should unhandled exceptions be managed in a production system?',
                    'options': 'Global exception handlers & logging|Silently catch and ignore|Crash the application|Suppress all log output',
                    'correct': 'Global exception handlers & logging',
                    'exp': 'Proper error handling ensures system stability and visibility.'
                },
                {
                    'prompt': f'What is the primary benefit of automated testing in {job_title} workflows?',
                    'options': 'Early bug detection & regression prevention|Slower release cycles|Increased manual effort|Avoiding code reviews',
                    'correct': 'Early bug detection & regression prevention',
                    'exp': 'Automated tests catch bugs early and improve software quality.'
                },
                {
                    'prompt': 'Which data structure offers O(1) average time complexity for key-value lookups?',
                    'options': 'Hash Map / Dictionary|Array / List|Linked List|Binary Tree',
                    'correct': 'Hash Map / Dictionary',
                    'exp': 'Hash tables provide constant time lookup on average.'
                },
                {
                    'prompt': 'Which security practice protects API endpoints against unauthorized access?',
                    'options': 'JWT Token Authentication & HTTPS|Storing passwords in plaintext|Disabling CORS headers|Exposing private keys',
                    'correct': 'JWT Token Authentication & HTTPS',
                    'exp': 'Token authentication and HTTPS encryption secure API communications.'
                }
            ]
            for q in sample_questions:
                db.add(Question(
                    assessment_id=assessment.id,
                    prompt=q['prompt'],
                    question_type='MCQ',
                    options=q['options'],
                    correct_answer=q['correct'],
                    explanation=q['exp']
                ))
            db.commit()
            questions = db.scalars(select(Question).where(Question.assessment_id == assessment.id)).all()
        return {'application_id': application.id, 'candidate_id': application.candidate_id, 'job_id': application.job_id, 'duration_minutes': assessment.duration_minutes if assessment else 30, 'questions': [{'id': q.id, 'prompt': q.prompt, 'options': q.options.split('|') if q.options else []} for q in questions]}

@router.post('/assessments/{token}/submit')
def submit_public_assessment(
    token: str,
    answers: dict,
    tab_switches: int = 0,
    fullscreen_exits: int = 0,
    copy_paste_events: int = 0,
    audio_violations: int = 0,
    visual_violations: int = 0,
    strikes: int = 0,
    time_taken: int = 0
):
    with SessionLocal() as db:
        application = db.scalar(select(Application).where(Application.assessment_token == token))
        if not application:
            public_assessment(token)
            application = db.scalar(select(Application).where(Application.assessment_token == token))
        assessment = db.get(Assessment, application.assessment_id)
        questions = db.scalars(select(Question).where(Question.assessment_id == assessment.id)).all() if assessment else []
        correct = sum(answers.get(str(q.id)) == q.correct_answer for q in questions)
        percentage = round(correct / len(questions) * 100) if questions else 0
        
        integrity_flag = (
            tab_switches >= 1 or
            fullscreen_exits >= 2 or
            copy_paste_events >= 1 or
            audio_violations >= 3 or
            visual_violations >= 3 or
            strikes >= 3
        )
        passed = (percentage >= 70) and (not integrity_flag)
        
        db.add(AssessmentAttempt(assessment_id=assessment.id, candidate_id=application.candidate_id, score=correct, percentage=percentage, time_taken=time_taken))
        application.status = 'Interview' if passed else 'Assessment'
        
        owner = db.scalar(select(User).where(User.organization_id == application.organization_id).order_by(User.id))
        if owner:
            violations_list = []
            if tab_switches >= 1: violations_list.append("Tab Switch")
            if audio_violations >= 3: violations_list.append("Voice Assistance / Heavy Sound")
            if visual_violations >= 3: violations_list.append("Phone Capture / Camera Block")
            if strikes >= 3: violations_list.append(f"{strikes} Proctoring Strikes")
            if copy_paste_events >= 1: violations_list.append("Copy-Paste")
            
            violation_str = f" [Proctoring Flagged: {', '.join(violations_list)}]" if integrity_flag else ""
            db.add(Notification(user_id=owner.id, title='Assessment Completed', message=f'Candidate scored {percentage}% ({correct}/{len(questions)} correct).{violation_str}'))
        db.commit()
        
        return {
            'score': correct,
            'percentage': percentage,
            'passed': passed,
            'integrity_flag': integrity_flag,
            'tab_switches': tab_switches,
            'audio_violations': audio_violations,
            'visual_violations': visual_violations,
            'strikes': strikes,
            'review_required': True
        }
