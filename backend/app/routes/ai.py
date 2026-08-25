import json
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..db import get_db
from ..dependencies.auth import current_user
from ..models import Candidate, Job, Resume, User
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..services.ai.provider import AIProvider
from ..services.ats_engine import calculate_ats_score

router = APIRouter(prefix='/ai', tags=['ai'])


# ── Request schemas ────────────────────────────────────────────────────────────

class JobDescriptionInput(BaseModel):
    title: str
    experience: str = ''
    skills: str = ''
    department: str = ''
    location: str = ''

class SuggestSkillsInput(BaseModel):
    title: str
    department: str = ''
    experience: str = ''
    skills: str = ''

class SuggestSectionsInput(BaseModel):
    title: str
    department: str = ''
    experience: str = ''
    skills: str = ''

class SocialPostInput(BaseModel):
    topic: str

class ResumeAnalysisInput(BaseModel):
    resume_text: str

class JobRecommendationInput(BaseModel):
    resume_text: str
    candidate_skills: Optional[List[str]] = []
    # When provided, Gemini will match against these specific job posts
    job_posts: Optional[List[dict]] = []

class ATSEvaluateInput(BaseModel):
    candidate_skills: List[str]
    candidate_exp_years: float = 0.0
    candidate_title: str = ''
    candidate_edu: Optional[List[str]] = []
    candidate_certs: Optional[List[str]] = []
    job_required_skills: List[str]
    job_preferred_skills: Optional[List[str]] = []
    job_min_exp: float = 0.0
    job_title: str = ''
    job_education: str = ''

class MatchInput(BaseModel):
    candidate_id: int
    job_id: int

class ResumeInput(BaseModel):
    resume_text: str

class AssessmentInput(BaseModel):
    job: str
    skills: str
    difficulty: str = 'Intermediate'
    count: int = 10

class TextInput(BaseModel):
    context: str


# ── Helper ─────────────────────────────────────────────────────────────────────

def _extract_json_object(raw: str) -> dict:
    """Extract first JSON object from a string."""
    if not raw:
        return {}
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


def _extract_json_array(raw: str) -> list:
    """Extract first JSON array from a string."""
    if not raw:
        return []
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post('/resume-analysis')
async def resume_analysis(payload: ResumeAnalysisInput, db: Session = Depends(get_db)):
    """
    Parse resume text → extract structured candidate profile.
    Then compare against all active jobs in DB → return best matching job.
    Everything powered by Gemini. No hardcoded data.
    """
    provider = AIProvider()

    # Step 1: Extract candidate profile from resume
    extract_prompt = f"""You are an expert resume parser. Extract the following details from the resume text below.

Return STRICTLY a valid JSON object with these exact keys:
{{
  "name": "Full name of the candidate",
  "currentJobTitle": "Current or most recent job title",
  "totalExperience": 3.5,
  "skills": ["List of all technical and domain skills found"],
  "education": ["Degree, Institution, Year"],
  "certifications": ["Any certifications or professional credentials"],
  "projects": ["Notable projects mentioned"],
  "previousRoles": ["Previous job titles / roles"]
}}

IMPORTANT:
- Extract REAL data from the resume — do NOT invent or guess
- totalExperience should be a number in years (e.g. 3.5)
- If a field has no data, use an empty list []
- Return ONLY the JSON object, no explanation

RESUME TEXT:
{payload.resume_text[:10000]}"""

    raw = await provider.complete(
        prompt=extract_prompt,
        system="You are an expert resume parser. Extract only what is explicitly stated in the resume. Return ONLY valid JSON."
    )
    candidate_profile = _extract_json_object(raw)
    if not candidate_profile:
        raise HTTPException(
            status_code=422,
            detail="Could not parse resume. Please ensure GEMINI_API_KEY is configured and try again."
        )

    # Step 2: Fetch all active/published jobs from DB
    try:
        db_jobs = db.scalars(select(Job).where(Job.status == 'published')).all()
        # Also include draft jobs if no published ones
        if not db_jobs:
            db_jobs = db.scalars(select(Job)).all()
    except Exception:
        db_jobs = []

    # Step 3: If jobs exist, ask Gemini which job best matches this candidate
    best_match = None
    if db_jobs:
        jobs_summary = []
        for j in db_jobs:
            skills_list = j.skills if isinstance(j.skills, list) else []
            jobs_summary.append({
                "id": j.id,
                "title": j.title or "",
                "department": j.department or "",
                "experience_level": j.experience_level or "",
                "location": j.location or "",
                "skills": skills_list,
                "description_snippet": (j.description or "")[:300]
            })

        match_prompt = f"""You are a senior recruiter. Compare the candidate profile below against all the job postings and find the BEST matching job.

CANDIDATE PROFILE:
- Name: {candidate_profile.get('name', 'Candidate')}
- Current Title: {candidate_profile.get('currentJobTitle', '')}
- Total Experience: {candidate_profile.get('totalExperience', 0)} years
- Skills: {', '.join(candidate_profile.get('skills', []))}
- Education: {', '.join(candidate_profile.get('education', []))}
- Certifications: {', '.join(candidate_profile.get('certifications', []))}
- Previous Roles: {', '.join(candidate_profile.get('previousRoles', []))}
- Projects: {', '.join(candidate_profile.get('projects', []))}

AVAILABLE JOB POSTINGS:
{json.dumps(jobs_summary, indent=2)}

Analyze each job posting and return the BEST match for this candidate.
Return STRICTLY valid JSON:
{{
  "bestJobId": <job id number or null>,
  "bestJobTitle": "Title of best matching job",
  "matchPercentage": 87,
  "matchingSkills": ["skills that match"],
  "missingSkills": ["skills the candidate lacks for this role"],
  "strengthAreas": ["areas where candidate strongly qualifies"],
  "experienceMatch": "Short description of how experience aligns",
  "explanation": "2-3 sentence explanation of why this is the best match",
  "alternativeMatches": [
    {{"jobId": <id>, "jobTitle": "Title", "matchPercentage": 70, "reason": "Brief reason"}}
  ]
}}"""

        match_raw = await provider.complete(
            prompt=match_prompt,
            system="You are an expert recruiter doing candidate-job matching. Return ONLY valid JSON with no markdown.",
            temperature=0.2
        )
        best_match = _extract_json_object(match_raw)

    result = dict(candidate_profile)
    result["bestJobMatch"] = best_match
    return result


@router.post('/job-recommendations')
async def job_recommendations(payload: JobRecommendationInput, db: Session = Depends(get_db)):
    """
    Compare candidate resume against the company's REAL job posts from DB.
    Gemini finds best matching jobs with match %, skills overlap, and reasoning.
    No hardcoded data — 100% Gemini-powered.
    """
    provider = AIProvider()

    # Fetch all jobs from DB
    try:
        db_jobs = db.scalars(select(Job).where(Job.status == 'published')).all()
        if not db_jobs:
            db_jobs = db.scalars(select(Job)).all()
    except Exception:
        db_jobs = []

    if db_jobs:
        jobs_summary = []
        for j in db_jobs:
            skills_list = j.skills if isinstance(j.skills, list) else []
            jobs_summary.append({
                "id": j.id,
                "title": j.title or "",
                "department": j.department or "",
                "experience_level": j.experience_level or "",
                "location": j.location or "",
                "required_skills": skills_list,
                "description_snippet": (j.description or "")[:400]
            })

        prompt = f"""You are a senior recruiter doing intelligent candidate-job matching.

CANDIDATE RESUME / PROFILE:
{payload.resume_text[:5000]}

COMPANY'S ACTIVE JOB POSTINGS:
{json.dumps(jobs_summary, indent=2)}

Analyze the candidate's resume against ALL job postings above.
Return the top 3-5 best matching jobs in order of match quality.

Return STRICTLY a valid JSON array:
[
  {{
    "jobId": <job id>,
    "jobTitle": "Exact job title from postings",
    "matchPercentage": 92,
    "matchingSkills": ["skills candidate has that match this job"],
    "missingSkills": ["skills required but candidate lacks"],
    "strengthAreas": ["strong qualification areas"],
    "experienceMatch": "How candidate experience aligns with job requirement",
    "explanation": "Why this job is a good fit for this candidate"
  }}
]"""

        raw = await provider.complete(
            prompt=prompt,
            system="You are an expert recruiter. Match the candidate to company job posts. Return ONLY valid JSON array.",
            temperature=0.2
        )
        recs = _extract_json_array(raw)
    else:
        # No jobs in DB — fall back to general market recommendations
        prompt = f"""Analyze the candidate resume/skills below and recommend 3-5 suitable job roles from the current market.

RESUME / SKILLS:
{payload.resume_text[:4000]}

Return STRICTLY a valid JSON array:
[
  {{
    "jobId": null,
    "jobTitle": "Recommended Role Title",
    "matchPercentage": 90,
    "matchingSkills": ["Skill A", "Skill B"],
    "missingSkills": ["Skill C"],
    "strengthAreas": ["Strong area 1"],
    "experienceMatch": "Experience alignment",
    "explanation": "Why this role fits the candidate"
  }}
]"""
        raw = await provider.complete(
            prompt=prompt,
            system="You are a career advisor. Suggest job roles for this candidate. Return ONLY valid JSON array."
        )
        recs = _extract_json_array(raw)

    if not recs:
        raise HTTPException(
            status_code=422,
            detail="Could not generate job recommendations. Please check GEMINI_API_KEY."
        )
    return {"recommendations": recs}


@router.post('/skill-suggestions')
async def skill_suggestions(payload: SuggestSkillsInput):
    provider = AIProvider()
    title = payload.title.strip() or "Specialist"
    skills_str = payload.skills.strip()

    prompt = f"""For a professional targeting the role '{title}', analyze these current skills: '{skills_str}'.

Separate which of these are verified existing skills vs recommend new in-demand market skills to learn.
Return STRICTLY valid JSON:
{{
  "existingSkills": ["verified skills from the input that are real"],
  "recommendedSkills": ["new trending 2024-2025 market skills to learn for this role"]
}}"""

    raw = await provider.complete(
        prompt=prompt,
        system="You are a tech skills advisor. Return ONLY valid JSON with existingSkills and recommendedSkills arrays."
    )
    parsed = _extract_json_object(raw)
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="Could not fetch skill suggestions. Please check GEMINI_API_KEY."
        )
    return parsed


@router.post('/suggest-skills')
@router.post('/suggest-skills-list')
async def suggest_skills_list(payload: SuggestSkillsInput):
    """
    Return 6–10 current market-relevant skills for a given job title + experience level.
    100% Gemini-powered — no hardcoded data.
    """
    provider = AIProvider()
    title = payload.title.strip() or "Specialist"
    exp = payload.experience.strip() or "Mid-level"
    dept = payload.department.strip()

    dept_clause = f" in the {dept} department" if dept else ""
    prompt = f"""List 8 to 10 key skills that are currently in HIGH DEMAND in the job market (2024-2025) for a '{title}' role ({exp}){dept_clause}.

Include:
- Core technical/domain skills specific to '{title}'
- Modern tools and platforms used in the industry right now
- Professional and soft skills relevant to the role

Return STRICTLY a valid JSON array of skill name strings only. No explanation, no markdown, just the JSON array.
Example format: ["Skill 1", "Skill 2", "Skill 3"]"""

    raw = await provider.complete(
        prompt=prompt,
        system=f"You are a recruitment market expert. Return ONLY a valid JSON array of in-demand skills for {title}."
    )
    skills = _extract_json_array(raw)
    if not skills:
        raise HTTPException(
            status_code=422,
            detail=f"Could not fetch market skills for '{title}'. Please check your GEMINI_API_KEY."
        )
    return {'skills': skills, 'skills_str': ", ".join(skills), 'role': title}


@router.post('/job-description')
async def job_description(payload: JobDescriptionInput):
    """
    Generate a professional, domain-accurate job description using Gemini.
    No hardcoded templates — 100% AI generated.
    """
    provider = AIProvider()
    title = payload.title.strip() or "Specialist"
    exp = payload.experience.strip() or "Mid-level"
    dept = payload.department.strip()
    skills = payload.skills.strip()
    location = payload.location.strip()

    dept_clause = f", Department: {dept}" if dept else ""
    skills_clause = f"\nRequired Skills: {skills}" if skills else ""
    location_clause = f", Location: {location}" if location else ""

    prompt = f"""Write a complete, professional job description for the following role:

Role: {title}
Experience: {exp}{dept_clause}{location_clause}{skills_clause}

Instructions:
- Write in a professional, engaging tone suitable for top job boards
- The content must be STRICTLY domain-accurate for '{title}' (e.g., don't mention coding for a chef, don't mention sports for a software engineer)
- Include these sections with proper markdown formatting:
  ## About the Role
  ## Key Responsibilities  (5-7 bullet points)
  ## Required Skills & Qualifications (based on the skills listed above)
  ## Preferred Qualifications
  ## What We Offer
- Make it feel like a real company is posting this — specific, compelling, not generic
- Do NOT include any placeholder text like [Company Name] — write it as a real posting"""

    content = await provider.complete(
        prompt=prompt,
        system=f"You are a senior HR content writer. Write a real, professional job description for '{title}'. Return only the job description text with markdown formatting."
    )
    if not content or len(content.strip()) < 50:
        raise HTTPException(
            status_code=422,
            detail="Could not generate job description. Please check GEMINI_API_KEY and try again."
        )
    return {'content': content.strip()}


@router.post('/suggest-social-post')
async def suggest_social_post(payload: SocialPostInput):
    provider = AIProvider()
    topic = payload.topic.strip()

    prompt = f"""Write an engaging LinkedIn/social media post about: '{topic}'

Include:
- An attention-grabbing opening line
- Key highlights or insights (3-4 bullet points)
- A clear call-to-action
- 5-8 relevant hashtags

Make it professional yet conversational. Suitable for LinkedIn."""

    content = await provider.complete(
        prompt=prompt,
        system=f"You are a social media content strategist. Write an engaging post about: {topic}",
        temperature=0.7
    )
    if not content:
        raise HTTPException(status_code=422, detail="Could not generate social post. Check GEMINI_API_KEY.")
    return {'content': content.strip()}


@router.post('/ats-evaluate')
def ats_evaluate(payload: ATSEvaluateInput):
    res = calculate_ats_score(
        candidate_skills=payload.candidate_skills,
        candidate_exp_years=payload.candidate_exp_years,
        candidate_title=payload.candidate_title,
        candidate_edu=payload.candidate_edu or [],
        candidate_certs=payload.candidate_certs or [],
        job_required_skills=payload.job_required_skills,
        job_preferred_skills=payload.job_preferred_skills or [],
        job_min_exp=payload.job_min_exp,
        job_title=payload.job_title,
        job_education=payload.job_education
    )
    return res


@router.post('/suggest-job-sections')
async def suggest_job_sections(payload: SuggestSectionsInput):
    provider = AIProvider()
    title = payload.title.strip()
    dept = payload.department.strip()
    exp = payload.experience.strip()
    skills = payload.skills.strip()

    prompt = f"""Generate structured job posting sections for:
Role: '{title}', Department: '{dept}', Experience: '{exp}', Skills: '{skills}'

Return STRICTLY a valid JSON object with these keys:
{{
  "about_job": "2-3 sentence overview of the role",
  "job_purpose": "1 sentence core purpose",
  "essential_functions": ["function 1", "function 2", "function 3", "function 4", "function 5"],
  "education_certifications": "Required education and certifications",
  "skills": ["technical skill 1", "technical skill 2", "technical skill 3"],
  "professional_skills": ["soft skill 1", "soft skill 2", "soft skill 3"]
}}"""

    raw = await provider.complete(
        prompt=prompt,
        system=f"Generate real, domain-accurate job sections for '{title}'. Return ONLY valid JSON.",
        temperature=0.3
    )
    parsed = _extract_json_object(raw)
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="Could not generate job sections. Check GEMINI_API_KEY."
        )
    return parsed


@router.post('/match')
async def match(payload: MatchInput, db: Session = Depends(get_db), _: User = Depends(current_user)):
    c = db.scalar(select(Candidate).where(Candidate.id == payload.candidate_id))
    j = db.scalar(select(Job).where(Job.id == payload.job_id))
    if not c or not j:
        raise HTTPException(status_code=404, detail="Candidate or job not found")
    r = db.scalar(select(Resume).where(Resume.candidate_id == c.id))
    provider = AIProvider()
    prompt = f"""Compare this candidate's profile with the job requirements and return a match analysis.

Candidate Resume/Experience:
{r.text if r else c.experience}

Job: {j.title}
Description: {j.description}
Required Skills: {j.skills}

Return STRICTLY valid JSON:
{{
  "overall_score": 85,
  "skills_score": 90,
  "experience_score": 80,
  "strengths": ["strength 1", "strength 2"],
  "missing_skills": ["skill gap 1", "skill gap 2"],
  "explanation": "Detailed match explanation"
}}"""

    raw = await provider.complete(prompt=prompt, system="You are an expert recruiter. Match the candidate to the job and return ONLY valid JSON.")
    if not raw:
        raise HTTPException(status_code=422, detail="Could not compute match. Check GEMINI_API_KEY.")
    return {"result": raw}


@router.post('/analyze-resume')
async def analyze_resume_endpoint(payload: ResumeInput, _: User = Depends(current_user)):
    provider = AIProvider()
    prompt = f"""Analyze this candidate resume and provide a structured report.

Resume Text:
{payload.resume_text[:8000]}

Provide analysis with these sections:
### 1. Suitable Roles & Profiles
### 2. Experience Level & Seniority
### 3. Recommended Projects & Team Fit
### 4. Core Skills & Technical Strengths
### 5. Skill Gaps & Development Areas"""

    res = await provider.complete(
        prompt=prompt,
        system="You are a senior talent acquisition expert. Analyze the resume and provide actionable insights."
    )
    if not res:
        raise HTTPException(status_code=422, detail="Could not analyze resume. Check GEMINI_API_KEY.")
    return res


@router.post('/offer')
async def offer(payload: TextInput, _: User = Depends(current_user)):
    provider = AIProvider()
    res = await provider.complete(
        prompt=f"""Draft a professional employment offer letter for:
{payload.context}

Include: Job title, compensation, start date placeholder, benefits overview, acceptance instructions.
Make it warm, professional and legally sensible.""",
        system="You are an HR professional. Draft a complete offer letter."
    )
    if not res:
        raise HTTPException(status_code=422, detail="Could not draft offer letter. Check GEMINI_API_KEY.")
    return {'content': res, 'review_required': True}
