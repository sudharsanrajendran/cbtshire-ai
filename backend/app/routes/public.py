import base64
from datetime import datetime
from secrets import token_urlsafe
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Response
from fastapi.responses import RedirectResponse
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

@router.get('/candidates/{candidate_id}/resume-file')
def get_candidate_resume_file(candidate_id: int):
    with SessionLocal() as db:
        resume = db.scalar(select(Resume).where(Resume.candidate_id == candidate_id).order_by(Resume.id.desc()))
        if not resume:
            # Check if candidate exists and return placeholder
            candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
            if not candidate:
                raise HTTPException(404, 'Candidate not found')
            html_doc = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/><title>{candidate.name} - Resume</title><style>body{{font-family:sans-serif;padding:40px;background:#f8fafc;color:#1e293b;}} .box{{max-width:700px;margin:0 auto;background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.05);}}</style></head><body><div class="box"><h2>{candidate.name}</h2><p><strong>Role:</strong> {candidate.role}</p><p><strong>Email:</strong> {candidate.email}</p><p><strong>Skills:</strong> {candidate.skills}</p></div></body></html>"""
            return Response(content=html_doc, media_type="text/html; charset=utf-8")
        
        if getattr(resume, 'file_base64', None) and len(resume.file_base64) > 50:
            try:
                file_bytes = base64.b64decode(resume.file_base64)
                return Response(
                    content=file_bytes,
                    media_type=resume.content_type or 'application/pdf',
                    headers={
                        'Content-Disposition': f'inline; filename="{resume.filename}"'
                    }
                )
            except Exception:
                pass
                
        if resume.storage_url and resume.storage_url.startswith('http'):
            return RedirectResponse(url=resume.storage_url)

        candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
        cand_name = candidate.name if candidate else "Candidate"
        cand_role = candidate.role if candidate else "Applicant"
        cand_email = candidate.email if candidate else ""
        raw_text = resume.extracted_text or resume.parsed_summary or "No raw text available."

        html_doc = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>{cand_name} - Resume</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .sheet {{ max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }}
        .name {{ font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }}
        .role {{ font-size: 16px; font-weight: 600; color: #0284c7; margin-top: 4px; }}
        .contact {{ color: #64748b; font-size: 13px; margin-top: 8px; }}
        .content {{ white-space: pre-wrap; font-size: 13.5px; line-height: 1.7; color: #334155; margin-top: 16px; }}
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div class="name">{cand_name}</div>
            <div class="role">{cand_role}</div>
            <div class="contact">Email: {cand_email} &nbsp;|&nbsp; File: {resume.filename}</div>
        </div>
        <div class="content">{raw_text}</div>
    </div>
</body>
</html>"""
        return Response(content=html_doc, media_type="text/html; charset=utf-8")

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
        if not job:
            raise HTTPException(404, 'Published job not found')

        extracted = extract_resume_text(content, file.content_type)
        analysis = "Candidate resume submitted for recruiter review."
        match_score = 75
        exp_level = "Mid-level"
        cand_skills = job.skills or ""

        try:
            ats_res = await evaluate_ats_match(extracted, job.title, job.experience_level, job.skills)
            if ats_res.get('match_score'):
                match_score = int(ats_res['match_score'])
            if ats_res.get('extracted_skills'):
                cand_skills = ', '.join(ats_res['extracted_skills'])
            if ats_res.get('extracted_experience'):
                exp_level = ats_res['extracted_experience']
            if ats_res.get('explanation'):
                analysis = ats_res['explanation']
            else:
                analysis = await analyze_resume(extracted)
        except Exception:
            pass

        candidate = Candidate(
            organization_id=job.organization_id,
            name=name,
            email=email,
            role=job.title,
            experience_level=exp_level,
            skills=cand_skills,
            status='Screening',
            source='Careers Portal',
            match_score=match_score
        )
        db.add(candidate)
        db.flush()

        storage_key, storage_url = "", ""
        file_b64 = ""
        try:
            file_b64 = base64.b64encode(content).decode('utf-8')
        except Exception:
            pass

        db.add(Resume(
            candidate_id=candidate.id,
            filename=file.filename or 'resume.pdf',
            content_type=file.content_type or 'application/pdf',
            extracted_text=extracted,
            parsed_summary=analysis,
            storage_key=storage_key,
            storage_url=storage_url,
            file_base64=file_b64
        ))
        
        assessment = db.scalar(select(Assessment).where(Assessment.organization_id == job.organization_id).order_by(Assessment.id.desc()))
        if not assessment:
            assessment = Assessment(organization_id=job.organization_id, title=f'{job.title} screening', job_id=job.id, question_count=0, duration_minutes=30, status='published')
            db.add(assessment)
            db.flush()
            
        owner = db.scalar(select(User).where(User.organization_id == job.organization_id).order_by(User.id))
        application = Application(
            organization_id=job.organization_id,
            job_id=job.id,
            candidate_id=candidate.id,
            assessment_id=assessment.id,
            match_score=match_score,
            match_explanation=analysis,
            assessment_token=token_urlsafe(32),
            status='Under Review'
        )
        db.add(application)
        if owner:
            db.add(Notification(
                user_id=owner.id,
                title='New Candidate Application',
                message=f'{name} applied for {job.title} ({match_score}% ATS Match). Review candidate to send assessment.'
            ))
        db.commit()

        # NOTE: Candidate is queued in Screening / Under Review for recruiter approval.
        # Assessment link will be sent when recruiter reviews and approves from Candidates dashboard.
        return {
            'application_id': application.id,
            'candidate_id': candidate.id,
            'match_score': match_score,
            'status': 'Screening',
            'ai_summary': analysis,
            'message': 'Application received successfully! Our recruitment team will review your profile and contact you.'
        }

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
