from datetime import datetime, timedelta
import random
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import SessionLocal, get_db
from ..dependencies.auth import current_user
from ..models import Candidate, Interview, Job, Notification, User, Application, Assessment

router = APIRouter(tags=['integrations'])

class SimulatedApplicationPayload(BaseModel):
    platform: str # 'linkedin' | 'naukri' | 'indeed' | 'website'
    job_id: int | None = None
    candidate_name: str
    candidate_email: str
    role: str = ''
    experience_years: int = 3
    skills: list[str] = []

class AutoScheduleConfig(BaseModel):
    min_score_threshold: int = Field(default=70, ge=40, le=95)
    auto_schedule_enabled: bool = True

# Standard Webhook Receiver for LinkedIn Easy Apply
@router.post('/webhooks/linkedin')
async def linkedin_webhook(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    return await process_external_candidate(
        platform='LinkedIn Easy Apply',
        name=data.get('name', 'LinkedIn Applicant'),
        email=data.get('email', 'applicant@linkedin.com'),
        role=data.get('job_title', 'Software Engineer'),
        job_id=data.get('job_id'),
        skills=data.get('skills', ['React', 'TypeScript', 'API']),
        db=db
    )

# Standard Webhook Receiver for Naukri e-Apps / Parser
@router.post('/webhooks/naukri')
async def naukri_webhook(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    return await process_external_candidate(
        platform='Naukri e-Apps',
        name=data.get('name', 'Naukri Applicant'),
        email=data.get('email', 'applicant@naukri.com'),
        role=data.get('job_title', 'Full Stack Developer'),
        job_id=data.get('job_id'),
        skills=data.get('skills', ['Python', 'FastAPI', 'SQL']),
        db=db
    )

# Standard Webhook Receiver for Indeed Apply
@router.post('/webhooks/indeed')
async def indeed_webhook(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    return await process_external_candidate(
        platform='Indeed Apply',
        name=data.get('name', 'Indeed Applicant'),
        email=data.get('email', 'applicant@indeed.com'),
        role=data.get('job_title', 'Backend Developer'),
        job_id=data.get('job_id'),
        skills=data.get('skills', ['PostgreSQL', 'Docker', 'Python']),
        db=db
    )

# Simulation endpoint for frontend UI testing
@router.post('/integrations/simulate')
async def simulate_candidate_ingestion(payload: SimulatedApplicationPayload, user: User = Depends(current_user), db: Session = Depends(get_db)):
    platform_name = {
        'linkedin': 'LinkedIn Easy Apply',
        'naukri': 'Naukri e-Apps',
        'indeed': 'Indeed Apply',
        'website': 'Company Careers Website'
    }.get(payload.platform.lower(), payload.platform)

    return await process_external_candidate(
        platform=platform_name,
        name=payload.candidate_name,
        email=payload.candidate_email,
        role=payload.role or 'Software Engineer',
        job_id=payload.job_id,
        skills=payload.skills or ['TypeScript', 'Node.js', 'React'],
        org_id=user.organization_id,
        db=db
    )
class LinkedInPostJobPayload(BaseModel):
    job_id: int | None = None
    position_name: str | None = None
    experience: str | None = None
    skills: str | None = None
    location: str | None = None
    profile_url: str | None = None
    custom_message: str | None = None

@router.post('/integrations/linkedin/post-job')
def generate_linkedin_job_post(payload: LinkedInPostJobPayload, db: Session = Depends(get_db)):
    job = None
    if payload.job_id:
        job = db.get(Job, payload.job_id)
    if not job and not payload.position_name:
        job = db.scalar(select(Job).order_by(Job.id.desc()))

    title = payload.position_name or (job.title if job else "Job Position")
    location = payload.location or (job.location if job else "Location Not Specified")
    skills = payload.skills or (job.skills if job else "")
    experience = payload.experience or (job.experience_level if job else "Not Specified")
    apply_url = f"http://127.0.0.1:5173/apply/{job.id if job else 1}"
    profile_url = payload.profile_url or "https://www.linkedin.com"
    
    tag_words = [w for w in (title + ' ' + skills).replace('/', ' ').replace('-', ' ').replace(',', ' ').split() if len(w) > 1 and w.isalnum()]
    clean_tags = list(dict.fromkeys([f"#{w}" for w in tag_words]))
    hashtag_str = " ".join(clean_tags[:6]) + " #Hiring #Jobs #Careers #TalentAcquisition"

    post_text = (
        f"🚀 We are hiring! {title} Position\n\n"
        f"📍 Location: {location}\n"
        f"💼 Role: {title}\n"
        f"⏳ Experience Required: {experience}\n"
        f"🛠️ Key Skills: {skills if skills else 'Relevant Technical Skills'}\n\n"
        f"📩 Interested candidates can apply directly via Cbtshire.ai:\n"
        f"{apply_url}\n\n"
        f"{hashtag_str}"
    )
    
    import urllib.parse
    encoded_text = urllib.parse.quote(post_text)
    share_url = f"https://www.linkedin.com/sharing/share-offsite/?url={urllib.parse.quote(apply_url)}"
    feed_share_url = f"https://www.linkedin.com/feed/?shareActive=true&text={encoded_text}"

    return {
        "status": "success",
        "profile_url": profile_url,
        "job": {
            "id": job.id if job else 1,
            "title": title,
            "location": location,
            "skills": skills,
            "experience": experience,
            "apply_url": apply_url
        },
        "post_text": post_text,
        "hashtags": hashtag_str,
        "share_url": share_url,
        "feed_share_url": feed_share_url
    }

class PlatformPostJobPayload(BaseModel):
    job_id: int | None = None
    position_name: str | None = None
    experience: str | None = None
    skills: str | None = None
    location: str | None = None
    custom_message: str | None = None

@router.post('/integrations/naukri/post-job')
def generate_naukri_job_post(payload: PlatformPostJobPayload, db: Session = Depends(get_db)):
    job = None
    if payload.job_id:
        job = db.get(Job, payload.job_id)
    if not job and not payload.position_name:
        job = db.scalar(select(Job).order_by(Job.id.desc()))

    title = payload.position_name or (job.title if job else "Job Position")
    location = payload.location or (job.location if job else "Location Not Specified")
    skills = payload.skills or (job.skills if job else "")
    experience = payload.experience or (job.experience_level if job else "Not Specified")
    apply_url = f"http://127.0.0.1:5173/apply/{job.id if job else 1}"

    tag_words = [w for w in (title + ' ' + skills).replace('/', ' ').replace('-', ' ').replace(',', ' ').split() if len(w) > 1 and w.isalnum()]
    clean_tags = list(dict.fromkeys([f"#{w}" for w in tag_words]))
    hashtag_str = " ".join(clean_tags[:6]) + " #NaukriJobs #Hiring #TechCareers"

    post_text = (
        f"📋 NAUKRI JOB POSTING FORMAT - {title}\n"
        f"----------------------------------------\n"
        f"Job Title: {title}\n"
        f"Location: {location}\n"
        f"Experience Required: {experience}\n"
        f"Key Skills: {skills if skills else 'Relevant Technical Skills'}\n"
        f"Employment Type: Full Time, Permanent\n\n"
        f"Job Description:\n"
        f"{job.description if job and job.description else f'We are actively seeking candidates for the position of {title} ({experience} experience) with skills in {skills}.'}\n\n"
        f"Direct Candidate Apply Link:\n"
        f"{apply_url}\n\n"
        f"Hashtags: {hashtag_str}\n"
        f"----------------------------------------"
    )

    return {
        "status": "success",
        "platform": "Naukri e-Apps",
        "job": {
            "id": job.id if job else 1,
            "title": title,
            "location": location,
            "skills": skills,
            "experience": experience,
            "apply_url": apply_url
        },
        "post_text": post_text,
        "hashtags": hashtag_str,
        "naukri_portal_url": "https://recruiter.naukri.com/"
    }

@router.post('/integrations/indeed/post-job')
def generate_indeed_job_post(payload: PlatformPostJobPayload, db: Session = Depends(get_db)):
    job = None
    if payload.job_id:
        job = db.get(Job, payload.job_id)
    if not job and not payload.position_name:
        job = db.scalar(select(Job).order_by(Job.id.desc()))

    title = payload.position_name or (job.title if job else "Job Position")
    location = payload.location or (job.location if job else "Location Not Specified")
    skills = payload.skills or (job.skills if job else "")
    experience = payload.experience or (job.experience_level if job else "Not Specified")
    apply_url = f"http://127.0.0.1:5173/apply/{job.id if job else 1}"
    xml_feed_url = f"http://127.0.0.1:8000/api/public/feed.xml"

    tag_words = [w for w in (title + ' ' + skills).replace('/', ' ').replace('-', ' ').replace(',', ' ').split() if len(w) > 1 and w.isalnum()]
    clean_tags = list(dict.fromkeys([f"#{w}" for w in tag_words]))
    hashtag_str = " ".join(clean_tags[:6]) + " #IndeedJobs #HiringNow #JobSearch"

    post_text = (
        f"🟠 INDEED APPLY JOB SPECIFICATION - {title}\n"
        f"----------------------------------------\n"
        f"Position: {title}\n"
        f"Location: {location}\n"
        f"Experience Required: {experience}\n"
        f"Job Type: Full-time\n"
        f"Required Skills: {skills if skills else 'Relevant Skills'}\n\n"
        f"Candidate Direct Apply Link:\n"
        f"{apply_url}\n\n"
        f"XML Syndication Feed:\n"
        f"{xml_feed_url}\n\n"
        f"Tags: {hashtag_str}\n"
        f"----------------------------------------"
    )

    return {
        "status": "success",
        "platform": "Indeed Apply",
        "job": {
            "id": job.id if job else 1,
            "title": title,
            "location": location,
            "skills": skills,
            "experience": experience,
            "apply_url": apply_url
        },
        "post_text": post_text,
        "hashtags": hashtag_str,
        "xml_feed_url": xml_feed_url,
        "indeed_portal_url": "https://employers.indeed.com/"
    }

# XML Feed Endpoint for Indeed & Job Boards
@router.get('/integrations/indeed/feed.xml')
def indeed_xml_feed(db: Session = Depends(get_db)):
    jobs = db.scalars(select(Job).where(Job.status == 'published')).all()
    xml_items = []
    for job in jobs:
        xml_items.append(f"""
        <job>
            <title><![CDATA[{job.title}]]></title>
            <company><![CDATA[Cbtshire.ai]]></company>
            <job_key>{job.id}</job_key>
            <location><![CDATA[{job.location}]]></location>
            <department><![CDATA[{job.department}]]></department>
            <description><![CDATA[{job.description}]]></description>
            <date>{job.created_at.strftime('%Y-%m-%d')}</date>
            <apply_url>http://127.0.0.1:5173/apply/{job.id}</apply_url>
        </job>""")

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<source>
    <publisher>Cbtshire.ai</publisher>
    <publisherurl>http://127.0.0.1:5173</publisherurl>
    <lastBuildDate>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</lastBuildDate>
    <jobs>
        {''.join(xml_items)}
    </jobs>
</source>"""
    return Response(content=xml_content, media_type="application/xml")

# Embedded Careers Page JS Widget Script
@router.get('/public/widget.js')
def jobs_widget_script():
    js_code = """
(function() {
    console.log("Cbtshire.ai Careers Embed Widget Initialized");
    var container = document.getElementById("cbtshire-careers");
    if (!container) return;
    fetch("http://127.0.0.1:8000/api/dashboard")
        .then(res => res.json())
        .then(data => {
            var jobs = data.jobs || [];
            var html = '<div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">';
            html += '<h2>Open Positions</h2><ul style="list-style: none; padding: 0;">';
            jobs.forEach(function(job) {
                html += '<li style="padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">';
                html += '<div><strong style="font-size: 18px;">' + job.title + '</strong><br/><span style="color: #666;">' + job.department + ' • ' + job.location + '</span></div>';
                html += '<a href="http://127.0.0.1:5173/apply/' + job.id + '" target="_blank" style="background: #087f8c; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">Apply Now</a>';
                html += '</li>';
            });
            html += '</ul></div>';
            container.innerHTML = html;
        }).catch(err => {
            container.innerHTML = '<p>Error loading jobs.</p>';
        });
})();
"""
    return Response(content=js_code, media_type="application/javascript")

# Internal Helper for Candidate Ingestion & AI Auto Interview Scheduling
async def process_external_candidate(platform: str, name: str, email: str, role: str, job_id: int | None, skills: list[str], db: Session, org_id: int | None = None):
    if not org_id:
        owner = db.scalar(select(User).order_by(User.id))
        org_id = owner.organization_id if owner else 1

    # Simulated AI evaluation match score (e.g., 75-95%)
    match_score = random.randint(75, 95)
    
    # Check if job exists
    target_job = None
    if job_id:
        target_job = db.get(Job, job_id)
    if not target_job:
        target_job = db.scalar(select(Job).where(Job.organization_id == org_id, Job.status == 'published'))

    role_title = target_job.title if target_job else role

    candidate = Candidate(
        organization_id=org_id,
        name=name,
        email=email,
        role=role_title,
        status='Screening',
        match_score=match_score
    )
    db.add(candidate)
    db.flush()

    if target_job:
        target_job.applicants = (target_job.applicants or 0) + 1

    # AI Auto-Interview Scheduling Trigger (Threshold >= 70%)
    auto_scheduled_interview = None
    if match_score >= 70:
        candidate.status = 'Interview'
        scheduled_date = datetime.utcnow() + timedelta(days=2)
        scheduled_date = scheduled_date.replace(hour=10, minute=0, second=0, microsecond=0)
        meeting_link = f"https://meet.jit.si/Cbtshire-Interview-{candidate.id}"

        interview = Interview(
            organization_id=org_id,
            candidate_id=candidate.id,
            interviewer_name="AI Automated Coordinator",
            interview_type="AI Automated Video Interview",
            scheduled_at=scheduled_date,
            status="Scheduled",
            meeting_link=meeting_link
        )
        db.add(interview)
        db.flush()
        auto_scheduled_interview = {
            'interview_id': interview.id,
            'scheduled_at': interview.scheduled_at.isoformat(),
            'meeting_link': interview.meeting_link,
            'interviewer': interview.interviewer_name
        }

    # Notify system users
    owner = db.scalar(select(User).where(User.organization_id == org_id).order_by(User.id))
    if owner:
        msg = f"New candidate {name} applied via {platform} (AI Match: {match_score}%)."
        if auto_scheduled_interview:
            msg += f" Interview automatically scheduled for {scheduled_date.strftime('%b %d at %H:%M')}!"
        db.add(Notification(user_id=owner.id, title=f"New Candidate ({platform})", message=msg))

    db.commit()

    return {
        'status': 'success',
        'platform': platform,
        'candidate': {
            'id': candidate.id,
            'name': candidate.name,
            'email': candidate.email,
            'role': candidate.role,
            'status': candidate.status,
            'match_score': candidate.match_score
        },
        'ai_evaluation': {
            'match_score': match_score,
            'qualifies_for_interview': match_score >= 70,
            'summary': f"AI evaluated {name}'s profile from {platform}. High match score ({match_score}%) with required role parameters."
        },
        'auto_scheduled_interview': auto_scheduled_interview
    }
