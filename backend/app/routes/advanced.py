from datetime import datetime
from io import BytesIO
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from pypdf import PdfReader
from docx import Document
from ..db import get_db
from ..dependencies.auth import current_user
from ..models import Assessment, AssessmentAttempt, Candidate, HiringEvent, Interview, InterviewFeedback, Job, Notification, Offer, Question, Resume, User
from ..services.ai.resume_analyzer import analyze_resume
from ..services.storage import CloudStorage

router = APIRouter(tags=['advanced'])
ALLOWED_RESUME_TYPES = {'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}

class QuestionInput(BaseModel):
    prompt: str
    question_type: str = 'MCQ'
    options: list[str] = []
    correct_answer: str = ''
    explanation: str = ''
class AttemptInput(BaseModel):
    candidate_id: int
    answers: dict[str, str] = {}
    time_taken: int = Field(default=0, ge=0)
class FeedbackInput(BaseModel):
    technical_skills: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    problem_solving: int = Field(ge=1, le=5)
    overall_rating: int = Field(ge=1, le=5)
    comments: str = ''
    recommendation: str = 'Maybe'
class EventInput(BaseModel):
    name: str
    event_type: str = 'Virtual Hiring'
    job_id: int | None = None
    location: str = ''
    starts_at: datetime
    openings: int = Field(default=1, ge=1)

@router.post('/candidates/resume')
async def upload_resume(file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if file.content_type not in ALLOWED_RESUME_TYPES: raise HTTPException(415, 'Only PDF, DOC, and DOCX resumes are supported')
    content = await file.read()
    if len(content) > 5 * 1024 * 1024: raise HTTPException(413, 'Resume must be 5 MB or smaller')
    try:
        storage_key, storage_url = CloudStorage().upload(content, file.filename or 'resume', file.content_type)
    except RuntimeError as error:
        raise HTTPException(503, str(error)) from error
    extracted = extract_resume_text(content, file.content_type)
    candidate = Candidate(organization_id=user.organization_id, name=file.filename.rsplit('.', 1)[0], email='', role='Unassigned', status='Applied')
    db.add(candidate); db.flush()
    analysis = await analyze_resume(extracted[:50000])
    resume = Resume(candidate_id=candidate.id, filename=file.filename, content_type=file.content_type, extracted_text=extracted[:50000], parsed_summary=analysis, storage_key=storage_key, storage_url=storage_url)
    db.add(resume); db.commit(); db.refresh(candidate)
    return {'candidate_id': candidate.id, 'resume_id': resume.id, 'filename': resume.filename, 'analysis': analysis, 'review_required': True}

@router.post('/assessments/{assessment_id}/questions')
def add_question(assessment_id: int, payload: QuestionInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.organization_id == user.organization_id))
    if not assessment: raise HTTPException(404, 'Assessment not found')
    question = Question(assessment_id=assessment_id, prompt=payload.prompt, question_type=payload.question_type, options='|'.join(payload.options), correct_answer=payload.correct_answer, explanation=payload.explanation)
    db.add(question); assessment.question_count += 1; db.commit(); db.refresh(question)
    return serialize_question(question)

@router.get('/assessments/{assessment_id}/questions')
def list_questions(assessment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.organization_id == user.organization_id))
    if not assessment: raise HTTPException(404, 'Assessment not found')
    return [serialize_question(item) for item in db.scalars(select(Question).where(Question.assessment_id == assessment_id)).all()]

@router.post('/assessments/{assessment_id}/submit')
def submit_assessment(assessment_id: int, payload: AttemptInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assessment = db.scalar(select(Assessment).where(Assessment.id == assessment_id, Assessment.organization_id == user.organization_id))
    if not assessment: raise HTTPException(404, 'Assessment not found')
    questions = db.scalars(select(Question).where(Question.assessment_id == assessment_id)).all()
    correct = sum(payload.answers.get(str(question.id)) == question.correct_answer for question in questions)
    percentage = round((correct / len(questions)) * 100) if questions else 0
    attempt = AssessmentAttempt(assessment_id=assessment_id, candidate_id=payload.candidate_id, score=correct, percentage=percentage, time_taken=payload.time_taken)
    db.add(attempt); db.commit(); db.refresh(attempt)
    return {'score': correct, 'percentage': percentage, 'correct_answers': correct, 'wrong_answers': max(0, len(questions) - correct), 'coding_score': percentage, 'time_taken': payload.time_taken}

@router.post('/interviews/{interview_id}/feedback')
def add_feedback(interview_id: int, payload: FeedbackInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    interview = db.scalar(select(Interview).where(Interview.id == interview_id, Interview.organization_id == user.organization_id))
    if not interview: raise HTTPException(404, 'Interview not found')
    feedback = InterviewFeedback(interview_id=interview_id, interviewer_id=user.id, **payload.model_dump()); interview.status = 'Completed'; db.add(feedback); db.add(Notification(user_id=user.id, title='Interview feedback saved', message=f'Feedback for interview {interview_id} is ready for recruiter review.')); db.commit()
    return {'id': feedback.id, 'status': 'saved', 'recommendation': feedback.recommendation}

@router.get('/hiring-events')
def list_events(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_event(event) for event in db.scalars(select(HiringEvent).where(HiringEvent.organization_id == user.organization_id).order_by(HiringEvent.starts_at)).all()]

@router.post('/hiring-events')
def create_event(payload: EventInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    event = HiringEvent(organization_id=user.organization_id, **payload.model_dump()); db.add(event); db.commit(); db.refresh(event)
    return {**serialize_event(event), 'application_url': f'/apply/event/{event.id}'}

@router.get('/notifications')
def notifications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{'id': item.id, 'title': item.title, 'message': item.message, 'is_read': item.is_read, 'created_at': item.created_at.isoformat()} for item in db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50)).all()]

@router.get('/analytics')
def analytics(user: User = Depends(current_user), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Candidate.id)).where(Candidate.organization_id == user.organization_id)) or 0
    shortlisted = db.scalar(select(func.count(Candidate.id)).where(Candidate.organization_id == user.organization_id, Candidate.status.in_(['Shortlisted', 'Interview', 'Selected', 'Hired']))) or 0
    interviews = db.scalar(select(func.count(Interview.id)).where(Interview.organization_id == user.organization_id)) or 0
    offers = db.scalar(select(func.count(Offer.id)).where(Offer.organization_id == user.organization_id)) or 0
    return {'total_applicants': total, 'shortlist_rate': round(shortlisted / total * 100) if total else 0, 'interview_conversion': round(interviews / total * 100) if total else 0, 'offer_rate': round(offers / total * 100) if total else 0, 'hiring_rate': 0, 'time_to_hire': 0}

@router.get('/search')
def search(q: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    term = f'%{q}%'
    jobs = db.scalars(select(Job).where(Job.organization_id == user.organization_id, or_(Job.title.ilike(term), Job.department.ilike(term))).limit(10)).all()
    candidates = db.scalars(select(Candidate).where(Candidate.organization_id == user.organization_id, or_(Candidate.name.ilike(term), Candidate.email.ilike(term), Candidate.role.ilike(term))).limit(10)).all()
    return {'jobs': [{'id': job.id, 'title': job.title} for job in jobs], 'candidates': [{'id': item.id, 'name': item.name, 'role': item.role} for item in candidates]}

def serialize_question(item: Question): return {'id': item.id, 'prompt': item.prompt, 'question_type': item.question_type, 'options': item.options.split('|') if item.options else [], 'correct_answer': item.correct_answer, 'explanation': item.explanation}
def serialize_event(item: HiringEvent): return {'id': item.id, 'name': item.name, 'event_type': item.event_type, 'job_id': item.job_id, 'location': item.location, 'starts_at': item.starts_at.isoformat(), 'openings': item.openings}
def extract_resume_text(content: bytes, content_type: str) -> str:
    try:
        if content_type == 'application/pdf':
            reader = PdfReader(BytesIO(content))
            return '\n'.join(page.extract_text() or '' for page in reader.pages)[:50000]
        if content_type.endswith('wordprocessingml.document'):
            return '\n'.join(paragraph.text for paragraph in Document(BytesIO(content)).paragraphs)[:50000]
    except Exception as err:
        print(f"[Resume Text Extraction Warning] {err}")
    return content.decode('utf-8', errors='ignore')[:50000]
