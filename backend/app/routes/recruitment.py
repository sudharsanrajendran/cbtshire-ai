from datetime import datetime
from secrets import token_urlsafe
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..config import get_settings
from ..db import get_db
from ..dependencies.auth import current_user
from ..models import Application, Assessment, AssessmentAttempt, Candidate, Interview, Job, Notification, Offer, Question, Resume, User
from ..services.email import send_assessment_invite, send_interview_invite
from ..services.ai.resume_analyzer import analyze_resume, evaluate_ats_match, extract_candidate_details_from_resume
from ..services.ai.assessment_generator import generate_assessment_questions, extract_questions_from_assessment_doc
from .advanced import extract_resume_text

router = APIRouter(tags=['recruitment'])

class JobInput(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    department: str = ''
    location: str = ''
    employment_type: str = 'Full-time'
    experience_level: str = 'Mid-level'
    skills: list[str] = []
    description: str = ''
    openings: int = Field(default=1, ge=1)

class CandidateInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    role: str = ''
    experience_level: str = 'Mid-level'
    skills: list[str] = []
    status: str = 'Applied'
    source: str = 'Careers Portal'
    match_score: int = Field(default=0, ge=0, le=100)
    job_id: int | None = None
    auto_send_assessment: bool = False

class AssessmentInput(BaseModel):
    title: str
    job_id: int | None = None
    question_count: int = Field(default=10, ge=1, le=100)
    duration_minutes: int = Field(default=30, ge=1, le=240)

class InterviewInput(BaseModel):
    candidate_id: int | None = None
    candidate_name: str | None = None
    candidate_email: str | None = None
    interviewer_name: str
    interview_type: str = 'Video'
    scheduled_at: datetime
    meeting_link: str = ''

class OfferInput(BaseModel):
    candidate_id: int
    job_id: int | None = None
    salary: str
    joining_date: datetime | None = None

@router.get('/jobs')
def list_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    jobs = db.scalars(select(Job).where(Job.organization_id == user.organization_id).order_by(Job.created_at.desc())).all()
    return [serialize_job(job) for job in jobs]

@router.post('/jobs')
def create_job(payload: JobInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = Job(organization_id=user.organization_id, **payload.model_dump(exclude={'skills'}), skills=','.join(payload.skills))
    db.add(job); db.commit(); db.refresh(job)
    return serialize_job(job)

@router.put('/jobs/{job_id}')
def update_job(job_id: int, payload: JobInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = get_org(db, Job, job_id, user.organization_id)
    job.title = payload.title
    job.department = payload.department
    job.location = payload.location
    job.employment_type = payload.employment_type
    job.experience_level = payload.experience_level
    job.skills = ','.join(payload.skills)
    job.description = payload.description
    job.openings = payload.openings
    db.commit()
    db.refresh(job)
    return serialize_job(job)

@router.patch('/jobs/{job_id}/status')
def update_job_status(job_id: int, status: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = get_org(db, Job, job_id, user.organization_id)
    if status not in {'draft', 'published', 'closed'}: raise HTTPException(400, 'Invalid job status')
    job.status = status; db.commit(); db.refresh(job)
    return serialize_job(job)

@router.delete('/jobs/{job_id}')
def delete_job(job_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = get_org(db, Job, job_id, user.organization_id); db.delete(job); db.commit()
    return {'deleted': True}

@router.get('/candidates')
def list_candidates(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_candidate(candidate, db) for candidate in db.scalars(select(Candidate).where(Candidate.organization_id == user.organization_id).order_by(Candidate.applied_at.desc())).all()]

@router.post('/candidates')
async def create_candidate(payload: CandidateInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    skills_joined = ', '.join(payload.skills) if isinstance(payload.skills, list) else str(payload.skills)
    candidate = Candidate(
        organization_id=user.organization_id,
        name=payload.name,
        email=payload.email,
        role=payload.role,
        experience_level=payload.experience_level or 'Mid-level',
        skills=skills_joined,
        status=payload.status,
        source=payload.source or 'Direct',
        match_score=payload.match_score
    )
    db.add(candidate)
    db.flush()

    # Match target job
    target_job = None
    if payload.job_id:
        target_job = db.get(Job, payload.job_id)
    if not target_job and payload.role:
        target_job = db.scalar(select(Job).where(
            Job.organization_id == user.organization_id,
            Job.title.ilike(f"%{payload.role}%")
        ))
    if not target_job:
        target_job = db.scalar(select(Job).where(Job.organization_id == user.organization_id).order_by(Job.id.desc()))

    job_title = target_job.title if target_job else (payload.role or 'Software Engineer')
    job_id = target_job.id if target_job else None

    if not candidate.role and target_job:
        candidate.role = target_job.title

    # Compute ATS match score if default 0
    if candidate.match_score == 0:
        if target_job:
            cand_skills = set(s.strip().lower() for s in skills_joined.split(',') if s.strip())
            job_skills = set(s.strip().lower() for s in target_job.skills.split(',') if s.strip())
            overlap = len(cand_skills.intersection(job_skills))
            total = max(len(job_skills), 1)
            candidate.match_score = min(98, max(65, int(60 + (overlap / total) * 35)))
        else:
            candidate.match_score = 85

    assessment_info = None

    job_desc = target_job.description if target_job and target_job.description else ''
    skills_str = skills_joined if skills_joined else (target_job.skills if target_job and target_job.skills else 'Software Engineering, Problem Solving')
    experience_level = payload.experience_level or (target_job.experience_level if target_job else 'Mid-level')

    # Always generate a fresh, dynamic assessment tailored specifically to Candidate + Job + Experience Level
    assessment = Assessment(
        organization_id=user.organization_id,
        title=f"{candidate.name} - {job_title} ({experience_level}) AI Assessment",
        job_id=job_id,
        question_count=5,
        duration_minutes=30,
        status='published' if payload.auto_send_assessment else 'draft'
    )
    db.add(assessment)
    db.flush()

    sample_questions = await generate_assessment_questions(
        job=job_title,
        skills=skills_str,
        difficulty=experience_level,
        job_description=job_desc,
        candidate_summary=f"Candidate: {candidate.name}, Role: {candidate.role}, Level: {experience_level}, Skills: {skills_str}",
        count=5
    )

    created_questions = []
    for q in sample_questions:
        q_obj = Question(
            assessment_id=assessment.id,
            prompt=q.get('prompt', 'Technical question'),
            question_type='MCQ',
            options=q.get('options', 'Option A|Option B|Option C|Option D'),
            correct_answer=q.get('correct', ''),
            explanation=q.get('exp', '')
        )
        db.add(q_obj)
        created_questions.append(q_obj)
    db.flush()

    assessment_token = token_urlsafe(32)
    application = Application(
        organization_id=user.organization_id,
        job_id=job_id or (target_job.id if target_job else 1),
        candidate_id=candidate.id,
        assessment_id=assessment.id,
        status='Assessment' if payload.auto_send_assessment else 'Draft',
        match_explanation=f"AI analyzed profile ({candidate.role}, {experience_level}) & skills ({skills_str}) against {job_title} requirements to generate dynamic custom assessment.",
        assessment_token=assessment_token,
        assessment_invited_at=datetime.utcnow() if payload.auto_send_assessment else None
    )
    db.add(application)

    public_app_url = get_settings().public_app_url or 'http://127.0.0.1:5173'
    assessment_link = f"{public_app_url}/assessment/{assessment_token}"
    email_sent = False

    if payload.auto_send_assessment:
        db.add(Notification(
            user_id=user.id,
            title='AI Assessment Sent',
            message=f"Automated AI Assessment invite for {job_title} ({experience_level}) sent to candidate {payload.name} ({payload.email})."
        ))
        email_sent = send_assessment_invite(payload.email, payload.name, f"{job_title} ({experience_level})", assessment_link, from_email=user.email, from_name=user.name)

    db.commit()

    assessment_info = {
        'assessment_id': assessment.id,
        'token': assessment_token,
        'assessment_link': assessment_link,
        'email_sent': email_sent,
        'status': assessment.status,
        'job_title': f"{job_title} ({experience_level})",
        'ai_analysis': f"Analyzed {job_title} requirements, {experience_level} seniority, and extracted candidate skills ({skills_str}). Generated {len(created_questions)} tailored, non-repeating technical questions.",
        'questions': [
            {
                'id': q.id,
                'prompt': q.prompt,
                'options': q.options.split('|') if isinstance(q.options, str) else q.options,
                'correct': q.correct_answer,
                'exp': q.explanation
            }
            for q in created_questions
        ]
    }

    serialized = serialize_candidate(candidate, db)
    if assessment_info:
        serialized['assessment_info'] = assessment_info

    return serialized

@router.post('/candidates/parse-resume')
async def parse_candidate_resume_endpoint(
    file: UploadFile = File(...),
    user: User = Depends(current_user)
):
    if not file:
        raise HTTPException(400, 'No resume file uploaded')
    content = await file.read()
    extracted_text = extract_resume_text(content, file.content_type)
    if not extracted_text:
        raise HTTPException(400, 'Could not read text from uploaded resume file')
    
    details = await extract_candidate_details_from_resume(extracted_text)
    return {
        'success': True,
        'filename': file.filename,
        'details': details
    }

@router.post('/candidates/with-resume')
async def create_candidate_with_resume(
    name: str = Form(...),
    email: str = Form(...),
    role: str = Form(''),
    experience_level: str = Form('Mid-level'),
    skills: str = Form(''),
    job_id: int | None = Form(None),
    auto_send_assessment: bool = Form(True),
    file: UploadFile = File(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    skills_list = [s.strip() for s in skills.split(',') if s.strip()] if skills else []
    extracted_text = ''
    analysis_text = ''
    ats_result = {}

    if file:
        content = await file.read()
        extracted_text = extract_resume_text(content, file.content_type)
        if extracted_text:
            analysis_text = await analyze_resume(extracted_text)
            target_job = db.get(Job, job_id) if job_id else None
            job_req_skills = target_job.skills if target_job else skills
            job_req_exp = target_job.experience_level if target_job else experience_level
            ats_result = await evaluate_ats_match(extracted_text, role or (target_job.title if target_job else 'Specialist'), job_req_exp, job_req_skills)

    match_score = ats_result.get('match_score', 85) if ats_result else 85
    extracted_skills_str = ', '.join(ats_result.get('extracted_skills', [])) if ats_result.get('extracted_skills') else skills

    payload = CandidateInput(
        name=name,
        email=email,
        role=role or ats_result.get('extracted_role', ''),
        experience_level=experience_level or ats_result.get('extracted_experience', 'Mid-level'),
        skills=[s.strip() for s in extracted_skills_str.split(',') if s.strip()] if extracted_skills_str else skills_list,
        match_score=match_score,
        job_id=job_id,
        auto_send_assessment=auto_send_assessment
    )

    res = await create_candidate(payload=payload, user=user, db=db)

    cand_id = res['id']
    if file and extracted_text:
        db.add(Resume(
            candidate_id=cand_id,
            filename=file.filename or 'resume.pdf',
            content_type=file.content_type or 'application/pdf',
            extracted_text=extracted_text,
            parsed_summary=analysis_text or ats_result.get('explanation', '')
        ))
        db.commit()

    return res

@router.post('/assessments/create-from-resume')
async def create_assessment_from_resume(
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    role: str = Form(''),
    experience_level: str = Form('Mid-level'),
    skills: str = Form(''),
    job_id: int | None = Form(None),
    file: UploadFile = File(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    return await create_candidate_with_resume(
        name=candidate_name,
        email=candidate_email,
        role=role,
        experience_level=experience_level,
        skills=skills,
        job_id=job_id,
        auto_send_assessment=False,
        file=file,
        user=user,
        db=db
    )

@router.post('/assessments/parse-doc')
async def parse_assessment_document(
    file: UploadFile = File(...),
    user: User = Depends(current_user)
):
    content = await file.read()
    extracted_text = extract_resume_text(content, file.content_type)
    if not extracted_text:
        raise HTTPException(400, 'Could not extract text from the uploaded document.')

    questions_data = await extract_questions_from_assessment_doc(extracted_text)
    return {
        'success': True,
        'filename': file.filename,
        'question_count': len(questions_data),
        'questions': [
            {
                'prompt': q.get('prompt', ''),
                'options': q.get('options', '').split('|') if isinstance(q.get('options'), str) else q.get('options', []),
                'correct_answer': q.get('correct', ''),
                'explanation': q.get('exp', '')
            }
            for q in questions_data
        ]
    }

@router.post('/assessments/create-from-doc')
async def create_assessment_from_document(
    file: UploadFile = File(...),
    title: str = Form('Custom Assessment'),
    candidate_id: int | None = Form(None),
    job_id: int | None = Form(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    extracted_text = extract_resume_text(content, file.content_type)
    if not extracted_text:
        raise HTTPException(400, 'Could not read document contents.')

    questions_data = await extract_questions_from_assessment_doc(extracted_text)
    if not questions_data:
        raise HTTPException(400, 'Could not extract questions from the document.')

    assessment = Assessment(
        organization_id=user.organization_id,
        title=title or (f"Assessment - {file.filename}"),
        job_id=job_id,
        question_count=len(questions_data),
        duration_minutes=30,
        status='draft'
    )
    db.add(assessment)
    db.flush()

    created_questions = []
    for q in questions_data:
        options_str = q.get('options') if isinstance(q.get('options'), str) else '|'.join(q.get('options', []))
        q_obj = Question(
            assessment_id=assessment.id,
            prompt=q.get('prompt', 'Question'),
            question_type='MCQ',
            options=options_str,
            correct_answer=q.get('correct', ''),
            explanation=q.get('exp', '')
        )
        db.add(q_obj)
        created_questions.append(q_obj)
    db.flush()

    candidate = db.get(Candidate, candidate_id) if candidate_id else None
    assessment_token = token_urlsafe(32)

    application = Application(
        organization_id=user.organization_id,
        job_id=job_id or (candidate.job_id if candidate and getattr(candidate, 'job_id', None) else 1),
        candidate_id=candidate.id if candidate else (db.scalar(select(Candidate.id).order_by(Candidate.id.desc())) or 1),
        assessment_id=assessment.id,
        status='Draft',
        match_explanation=f"Custom Assessment uploaded from document ({file.filename}).",
        assessment_token=assessment_token,
        assessment_invited_at=None
    )
    db.add(application)
    db.commit()

    public_app_url = get_settings().public_app_url or 'http://127.0.0.1:5173'
    assessment_link = f"{public_app_url}/assessment/{assessment_token}"

    return {
        'success': True,
        'assessment_id': assessment.id,
        'title': assessment.title,
        'status': assessment.status,
        'candidate_name': candidate.name if candidate else None,
        'candidate_email': candidate.email if candidate else None,
        'assessment_link': assessment_link,
        'token': assessment_token,
        'question_count': len(created_questions),
        'questions': [
            {
                'id': q.id,
                'prompt': q.prompt,
                'options': q.options.split('|') if isinstance(q.options, str) else q.options,
                'correct': q.correct_answer,
                'exp': q.explanation
            }
            for q in created_questions
        ]
    }

@router.patch('/candidates/{candidate_id}/status')
def update_candidate_status(candidate_id: int, status: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    candidate = get_org(db, Candidate, candidate_id, user.organization_id); candidate.status = status; db.commit(); db.refresh(candidate)
    return serialize_candidate(candidate, db)

@router.post('/candidates/{candidate_id}/resend-assessment')
def resend_candidate_assessment(candidate_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    candidate = get_org(db, Candidate, candidate_id, user.organization_id)
    application = db.scalar(select(Application).where(Application.candidate_id == candidate.id).order_by(Application.id.desc()))

    if not application:
        job = db.scalar(select(Job).where(Job.organization_id == user.organization_id).order_by(Job.id.desc()))
        assessment = db.scalar(select(Assessment).where(Assessment.organization_id == user.organization_id).order_by(Assessment.id.desc()))
        if not assessment:
            assessment = Assessment(
                organization_id=user.organization_id,
                title=f"{candidate.role or 'Technical'} AI Screening",
                job_id=job.id if job else None,
                question_count=5,
                duration_minutes=30,
                status='published'
            )
            db.add(assessment)
            db.flush()

        new_token = token_urlsafe(32)
        application = Application(
            organization_id=user.organization_id,
            job_id=job.id if job else 1,
            candidate_id=candidate.id,
            assessment_id=assessment.id,
            status='Assessment',
            match_explanation='Assessment created for resending invitation.',
            assessment_token=new_token,
            assessment_invited_at=datetime.utcnow()
        )
        db.add(application)
        db.flush()

    public_app_url = get_settings().public_app_url or 'http://127.0.0.1:5173'
    assessment_link = f"{public_app_url}/assessment/{application.assessment_token}"
    application.assessment_invited_at = datetime.utcnow()

    db.add(Notification(
        user_id=user.id,
        title='Assessment Link Resent',
        message=f"Assessment invite link resent to {candidate.name} ({candidate.email})."
    ))
    db.commit()

    job_title = candidate.role or 'Technical Assessment'
    email_sent = send_assessment_invite(candidate.email, candidate.name, job_title, assessment_link, from_email=user.email, from_name=user.name)

    return {
        'success': True,
        'candidate_id': candidate.id,
        'candidate_name': candidate.name,
        'email': candidate.email,
        'assessment_link': assessment_link,
        'email_sent': email_sent,
        'message': f"Assessment link successfully resent to {candidate.email}"
    }

@router.get('/assessments')
def list_assessments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_assessment(item) for item in db.scalars(select(Assessment).where(Assessment.organization_id == user.organization_id)).all()]

@router.get('/assessments/attempts')
def list_assessment_attempts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    attempts = db.scalars(
        select(AssessmentAttempt)
        .order_by(AssessmentAttempt.id.desc())
    ).all()

    results = []
    for attempt in attempts:
        candidate = db.get(Candidate, attempt.candidate_id)
        assessment = db.get(Assessment, attempt.assessment_id)
        job = db.get(Job, assessment.job_id) if assessment and assessment.job_id else None

        results.append({
            'id': attempt.id,
            'assessment_id': attempt.assessment_id,
            'assessment_title': assessment.title if assessment else 'Technical Screening',
            'candidate_id': attempt.candidate_id,
            'candidate_name': candidate.name if candidate else 'Unknown Candidate',
            'candidate_email': candidate.email if candidate else '',
            'role': candidate.role if candidate else (job.title if job else 'Software Developer'),
            'score': attempt.score,
            'percentage': attempt.percentage,
            'time_taken': attempt.time_taken,
            'passed': attempt.percentage >= 70,
            'status': 'Passed 🎉' if attempt.percentage >= 70 else 'Needs Review'
        })
    return results

class QuestionItem(BaseModel):
    id: int | None = None
    prompt: str
    options: list[str] | str
    correct_answer: str
    explanation: str = ''

class UpdateQuestionsInput(BaseModel):
    questions: list[QuestionItem]

@router.get('/assessments/{assessment_id}/questions')
def get_assessment_questions(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = get_org(db, Assessment, assessment_id, user.organization_id)
    questions = db.scalars(select(Question).where(Question.assessment_id == assessment.id)).all()
    
    app_obj = db.scalar(select(Application).where(Application.assessment_id == assessment.id).order_by(Application.id.desc()))
    candidate = db.get(Candidate, app_obj.candidate_id) if app_obj else None
    
    public_app_url = get_settings().public_app_url or 'http://127.0.0.1:5173'
    assessment_link = f"{public_app_url}/assessment/{app_obj.assessment_token}" if app_obj and app_obj.assessment_token else None

    return {
        'assessment_id': assessment.id,
        'title': assessment.title,
        'status': assessment.status,
        'candidate_name': candidate.name if candidate else None,
        'candidate_email': candidate.email if candidate else None,
        'assessment_link': assessment_link,
        'token': app_obj.assessment_token if app_obj else None,
        'invited_at': app_obj.assessment_invited_at.isoformat() if app_obj and app_obj.assessment_invited_at else None,
        'questions': [
            {
                'id': q.id,
                'prompt': q.prompt,
                'options': q.options.split('|') if isinstance(q.options, str) else q.options,
                'correct_answer': q.correct_answer,
                'explanation': q.explanation
            }
            for q in questions
        ]
    }

@router.put('/assessments/{assessment_id}/questions')
def update_assessment_questions(assessment_id: int, payload: UpdateQuestionsInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = get_org(db, Assessment, assessment_id, user.organization_id)
    old_questions = db.scalars(select(Question).where(Question.assessment_id == assessment.id)).all()
    for q in old_questions:
        db.delete(q)
    db.flush()

    for q in payload.questions:
        options_str = '|'.join(q.options) if isinstance(q.options, list) else str(q.options)
        db.add(Question(
            assessment_id=assessment.id,
            prompt=q.prompt,
            question_type='MCQ',
            options=options_str,
            correct_answer=q.correct_answer,
            explanation=q.explanation
        ))
    assessment.question_count = len(payload.questions)
    db.commit()
    return {'success': True, 'question_count': len(payload.questions)}

@router.post('/assessments/{assessment_id}/send')
def send_assessment_to_candidate(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = get_org(db, Assessment, assessment_id, user.organization_id)
    application = db.scalar(select(Application).where(Application.assessment_id == assessment.id).order_by(Application.id.desc()))
    if not application:
        raise HTTPException(404, 'No candidate application linked to this assessment')
    
    candidate = db.get(Candidate, application.candidate_id)
    if not candidate:
        raise HTTPException(404, 'Candidate not found')

    if not application.assessment_token:
        application.assessment_token = token_urlsafe(32)
    application.assessment_invited_at = datetime.utcnow()
    application.status = 'Assessment'
    assessment.status = 'published'

    public_app_url = get_settings().public_app_url or 'http://127.0.0.1:5173'
    assessment_link = f"{public_app_url}/assessment/{application.assessment_token}"
    email_sent = send_assessment_invite(
        candidate.email,
        candidate.name,
        assessment.title,
        assessment_link,
        from_email=user.email,
        from_name=user.name
    )

    db.add(Notification(
        user_id=user.id,
        title='Assessment Sent',
        message=f"Assessment invite for {assessment.title} dispatched to candidate {candidate.name} ({candidate.email})."
    ))
    db.commit()

    return {
        'success': True,
        'assessment_id': assessment.id,
        'candidate_id': candidate.id,
        'candidate_name': candidate.name,
        'email': candidate.email,
        'assessment_link': assessment_link,
        'email_sent': email_sent,
        'message': f"Assessment successfully dispatched to {candidate.email}!"
    }

@router.post('/assessments')
def create_assessment(payload: AssessmentInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = Assessment(organization_id=user.organization_id, **payload.model_dump()); db.add(item); db.commit(); db.refresh(item)
    return serialize_assessment(item)

@router.get('/interviews')
def list_interviews(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_interview(item, db) for item in db.scalars(select(Interview).where(Interview.organization_id == user.organization_id).order_by(Interview.scheduled_at)).all()]

@router.post('/interviews')
def create_interview(payload: InterviewInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    candidate = None
    if payload.candidate_id:
        candidate = db.get(Candidate, payload.candidate_id)

    if not candidate and payload.candidate_email:
        candidate = db.scalar(select(Candidate).where(Candidate.email == payload.candidate_email).order_by(Candidate.id.desc()))

    if not candidate:
        # Look up candidate in current user's organization
        candidate = db.scalar(select(Candidate).where(Candidate.organization_id == user.organization_id).order_by(Candidate.id.desc()))

    if not candidate:
        candidate = Candidate(
            organization_id=user.organization_id,
            name=payload.candidate_name or 'Candidate',
            email=payload.candidate_email or user.email,
            role='Software Engineer',
            status='Interview Scheduled'
        )
        db.add(candidate)
        db.flush()
    else:
        candidate.organization_id = user.organization_id
        candidate.status = 'Interview Scheduled'
        db.flush()

    item = Interview(
        organization_id=user.organization_id,
        candidate_id=candidate.id,
        interviewer_name=payload.interviewer_name,
        interview_type=payload.interview_type,
        scheduled_at=payload.scheduled_at,
        meeting_link=payload.meeting_link,
        status='Scheduled'
    )
    db.add(item)
    db.flush()

    job_title = candidate.role or 'Candidate Role'
    scheduled_str = payload.scheduled_at.strftime('%A, %B %d, %Y at %I:%M %p') if isinstance(payload.scheduled_at, datetime) else str(payload.scheduled_at)

    email_sent = send_interview_invite(
        to_email=candidate.email,
        candidate_name=candidate.name,
        job_title=job_title,
        scheduled_at=scheduled_str,
        interview_type=payload.interview_type,
        interviewer_name=payload.interviewer_name,
        meeting_link=payload.meeting_link,
        from_email=user.email,
        from_name=user.name
    )

    db.add(Notification(
        user_id=user.id,
        title='Interview Scheduled',
        message=f"Interview scheduled with {candidate.name} ({candidate.email}) for {scheduled_str}."
    ))

    db.commit()
    db.refresh(item)
    return serialize_interview(item, db)

@router.patch('/interviews/{interview_id}/status')
def update_interview_status(
    interview_id: int,
    status: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    interview = db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(404, 'Interview not found')
    interview.status = status
    if status == 'Completed':
        candidate = db.get(Candidate, interview.candidate_id)
        if candidate:
            candidate.status = 'Interview Completed'
    db.commit()
    db.refresh(interview)
    return serialize_interview(interview, db)

@router.get('/offers')
def list_offers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_offer(item, db) for item in db.scalars(select(Offer).where(Offer.organization_id == user.organization_id)).all()]

@router.post('/offers')
def create_offer(payload: OfferInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    get_org(db, Candidate, payload.candidate_id, user.organization_id)
    item = Offer(organization_id=user.organization_id, **payload.model_dump()); db.add(item); db.commit(); db.refresh(item)
    return serialize_offer(item, db)

def get_org(db: Session, model: type, item_id: int, organization_id: int):
    item = db.scalar(select(model).where(model.id == item_id, model.organization_id == organization_id))
    if not item: raise HTTPException(404, 'Record not found')
    return item

def serialize_job(job: Job):
    return {'id': job.id, 'title': job.title, 'department': job.department, 'location': job.location, 'employment_type': job.employment_type, 'experience_level': job.experience_level, 'status': job.status, 'applicants': job.applicants, 'openings': job.openings, 'skills': [skill for skill in job.skills.split(',') if skill] if job.skills else [], 'description': job.description or ''}

def serialize_candidate(candidate: Candidate, db: Session = None):
    app_info = None
    if db:
        app_obj = db.scalar(select(Application).where(Application.candidate_id == candidate.id).order_by(Application.id.desc()))
        if app_obj and app_obj.assessment_token:
            public_app_url = get_settings().public_app_url or 'http://127.0.0.1:5173'
            app_info = {
                'token': app_obj.assessment_token,
                'assessment_link': f"{public_app_url}/assessment/{app_obj.assessment_token}",
                'invited_at': app_obj.assessment_invited_at.isoformat() if app_obj.assessment_invited_at else None
            }
    skills_list = [s.strip() for s in candidate.skills.split(',') if s.strip()] if getattr(candidate, 'skills', None) else []
    exp_level = getattr(candidate, 'experience_level', 'Mid-level') or 'Mid-level'
    return {
        'id': candidate.id,
        'name': candidate.name,
        'email': candidate.email,
        'role': candidate.role,
        'experience_level': exp_level,
        'skills': skills_list,
        'match_score': candidate.match_score,
        'status': candidate.status,
        'source': getattr(candidate, 'source', 'Careers Portal') or 'Careers Portal',
        'applied_at': candidate.applied_at.isoformat(),
        'assessment_info': app_info
    }

def serialize_assessment(item: Assessment):
    return {'id': item.id, 'title': item.title, 'job_id': item.job_id, 'question_count': item.question_count, 'duration_minutes': item.duration_minutes, 'status': item.status}

def serialize_interview(item: Interview, db: Session):
    candidate = db.get(Candidate, item.candidate_id)
    return {
        'id': item.id,
        'candidate_id': item.candidate_id,
        'candidate_name': candidate.name if candidate else 'Unknown',
        'candidate_email': candidate.email if candidate else '',
        'candidate_role': candidate.role if candidate else 'Software Engineer',
        'interviewer_name': item.interviewer_name,
        'interview_type': item.interview_type,
        'scheduled_at': item.scheduled_at.isoformat(),
        'status': item.status,
        'meeting_link': item.meeting_link
    }

def serialize_offer(item: Offer, db: Session):
    candidate = db.get(Candidate, item.candidate_id)
    return {'id': item.id, 'candidate_id': item.candidate_id, 'candidate_name': candidate.name if candidate else 'Unknown', 'job_id': item.job_id, 'salary': item.salary, 'joining_date': item.joining_date.isoformat() if item.joining_date else None, 'status': item.status}
