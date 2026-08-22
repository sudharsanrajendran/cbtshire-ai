from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..dependencies.auth import current_user
from ..models import Candidate, Interview, Job, Offer, User

router = APIRouter(tags=['dashboard'])
@router.get('/dashboard')
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    jobs = db.scalars(select(Job).where(Job.organization_id == user.organization_id).order_by(Job.created_at.desc())).all()
    candidates = db.scalars(select(Candidate).where(Candidate.organization_id == user.organization_id).order_by(Candidate.applied_at.desc()).limit(5)).all()
    total_candidates = db.scalar(select(func.count(Candidate.id)).where(Candidate.organization_id == user.organization_id)) or 0
    shortlisted = db.scalar(select(func.count(Candidate.id)).where(Candidate.organization_id == user.organization_id, Candidate.status == 'Shortlisted')) or 0
    interviews = db.scalar(select(func.count(Interview.id)).where(Interview.organization_id == user.organization_id)) or 0
    offers = db.scalar(select(func.count(Offer.id)).where(Offer.organization_id == user.organization_id)) or 0
    hired = db.scalar(select(func.count(Candidate.id)).where(Candidate.organization_id == user.organization_id, Candidate.status == 'Hired')) or 0
    return {'stats': {'total_jobs': len(jobs), 'active_jobs': sum(job.status == 'published' for job in jobs), 'total_candidates': total_candidates, 'shortlisted': shortlisted, 'interviews': interviews, 'offers': offers, 'hired': hired}, 'jobs': [{'id': job.id, 'title': job.title, 'department': job.department, 'location': job.location, 'status': job.status, 'applicants': job.applicants, 'openings': job.openings} for job in jobs], 'candidates': [{'id': candidate.id, 'name': candidate.name, 'email': candidate.email, 'role': candidate.role, 'status': candidate.status, 'match_score': candidate.match_score, 'applied_at': candidate.applied_at.isoformat()} for candidate in candidates], 'activity': []}
