import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..db import get_db
from ..dependencies.auth import current_user
from ..models import Candidate, Job, Resume, User
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..services.ai.assessment_generator import generate_assessment
from ..services.ai.job_matcher import match_candidate
from ..services.ai.offer_generator import generate_offer
from ..services.ai.resume_analyzer import analyze_resume
from ..services.ai.candidate_insights import candidate_insights
from ..services.ai.provider import AIProvider

router = APIRouter(prefix='/ai', tags=['ai'])
class JobDescriptionInput(BaseModel):
    title: str
    experience: str = ''
    skills: str = ''
    department: str = ''

class SuggestSkillsInput(BaseModel):
    title: str
    department: str = ''
    experience: str = ''

class MatchInput(BaseModel): candidate_id: int; job_id: int
class ResumeInput(BaseModel): resume_text: str
class AssessmentInput(BaseModel): job: str; skills: str; difficulty: str = 'Intermediate'; count: int = 10
class TextInput(BaseModel): context: str

def generate_fallback_job_description(title: str, department: str, experience: str, skills: str) -> str:
    role_title = title.strip() if title and title.strip() else "Specialist"
    dept = department.strip() if department and department.strip() else "Operations"
    exp = experience.strip() if experience and experience.strip() else "3+ years"
    skills_list = [s.strip() for s in skills.split(',') if s.strip()] if skills else []
    skills_str = ", ".join(skills_list) if skills_list else "Domain Expertise & Industry Best Practices"
    
    bullets = "\n".join([f"• Demonstrated hands-on proficiency in {s}" for s in skills_list]) if skills_list else f"• Demonstrated professional competency in {role_title} workflows\n• Knowledge of relevant industry regulations, tools, and best practices"

    return f"""### About the Role: {role_title}
We are seeking an experienced and dedicated **{role_title}** to join our **{dept}** team. In this position, you will be responsible for driving excellence, executing core operational and technical requirements, and ensuring adherence to safety, quality, and industry standards in **{skills_str}**.

### Key Responsibilities:
• Lead and execute domain-specific responsibilities and operational tasks for {role_title}.
• Apply hands-on expertise in **{skills_str}** to ensure high performance, accuracy, and reliability.
• Coordinate with multidisciplinary teams, stakeholders, and regulatory bodies to deliver quality outcomes.
• Troubleshoot, inspect, and optimize processes to uphold standard operating procedures and safety protocols.
• Document workflows, review technical specifications, and champion continuous process improvement.

### Required Qualifications & Experience:
• **Experience:** {exp} of relevant industry experience in {dept} or related domains.
• **Core Domain Skills:**
{bullets}
• Strong problem-solving, root-cause analysis, and critical thinking capabilities.
• Excellent communication, collaboration, and professional reporting skills.

### Preferred Qualifications:
• Relevant degree, diploma, or recognized trade license/certification for {role_title}.
• Familiarity with modern industry tooling, diagnostic instruments, and quality frameworks.

### What We Offer:
• Competitive compensation and comprehensive benefits package.
• Clear career progression pathways and continuous professional development."""

@router.post('/suggest-skills')
async def suggest_skills(payload: SuggestSkillsInput, _: User = Depends(current_user)):
    clean_title = payload.title.strip() if payload.title else "Professional"
    clean_dept = payload.department.strip() if payload.department else ""
    clean_exp = payload.experience.strip() if payload.experience else "Mid-level"

    system_prompt = (
        "You are an elite Global Talent Acquisition and Labor Market Intelligence Analyst. "
        "Your task is to analyze the given Job Title, Department, and Seniority Level, identify the EXACT industry domain "
        "(e.g., Aviation/Aerospace, Civil Construction, Healthcare, Manufacturing, Supply Chain, Finance, IT/Software, etc.), "
        "and return the TOP 6 to 8 most in-demand, realistic, current-market skills, tools, certifications, and technical proficiencies for that exact role. "
        "CRITICAL RULE: DO NOT return generic software programming or DevOps skills unless the role is genuinely a software engineering role! "
        "For non-software roles (e.g. MRO Aviation Engineer, Nurse, Mechanical Engineer, Accountant), return domain-specific tools, standards, licenses, and core competencies. "
        "Respond STRICTLY with a valid JSON array of strings (e.g. [\"Skill 1\", \"Skill 2\", \"Skill 3\"])."
    )

    user_prompt = f"Target Role: {clean_title}\nDepartment: {clean_dept}\nExperience Level: {clean_exp}\n\nGenerate the top current market required skills, tools, and certifications for this role in JSON list format."

    try:
        raw_res = await AIProvider().complete(system_prompt, user_prompt)
        import re
        match = re.search(r'\[.*\]', raw_res, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list) and len(parsed) > 0:
                skills_list = [str(s).strip() for s in parsed if str(s).strip()]
                return {
                    'skills': skills_list,
                    'skills_str': ', '.join(skills_list),
                    'role': clean_title
                }
    except Exception as e:
        print("[Suggest Skills Error]:", e)

    return {
        'skills': [f"{clean_title} Core Competencies", "Industry Quality Standards", "Process Optimization", "Safety & Compliance"],
        'skills_str': f"{clean_title} Core Competencies, Industry Quality Standards, Process Optimization, Safety & Compliance",
        'role': clean_title
    }

@router.post('/job-description')
async def job_description(payload: JobDescriptionInput, _: User = Depends(current_user)):
    clean_title = payload.title.strip() if payload.title else "Specialist"
    clean_dept = payload.department.strip() if payload.department else "Operations"
    clean_exp = payload.experience.strip() if payload.experience else "Mid-level"
    clean_skills = payload.skills.strip() if payload.skills else ""

    system_prompt = (
        "You are an expert Talent Acquisition Director and Domain Hiring Consultant. "
        "Analyze the target Job Title, Department, Experience Level, and Required Skills. "
        "CRITICAL INSTRUCTIONS:\n"
        "1. ACCURATELY identify the industry domain (e.g. Aviation/Aerospace, Mechanical/Industrial, Healthcare, Civil, Finance, IT, Sales, etc.).\n"
        "2. NEVER assume or default to software engineering, coding, or DevOps if the job title belongs to another industry (e.g., Aviation MRO Engineer requires airframe/powerplant maintenance, FAA/EASA compliance, line maintenance, avionics overhaul; NOT git or web code reviews).\n"
        "3. If required skills were not provided, automatically deduce the authentic current-market skills, tools, and certifications for this role.\n"
        "4. Structure the Job Description professionally with clear markdown headings:\n"
        "   ### About the Role\n"
        "   ### Key Responsibilities\n"
        "   ### Required Qualifications & Industry Experience\n"
        "   ### Core Technical & Domain Skills\n"
        "   ### Preferred Licenses, Certifications & Tools\n"
        "   ### What We Offer"
    )

    user_prompt = f"Target Job Title: {clean_title}\nDepartment: {clean_dept}\nExperience Level: {clean_exp}\nRequired/Preferred Skills: {clean_skills or 'Auto-deduce from current industry market'}\n\nGenerate an authentic, highly detailed, domain-accurate job description."
    
    content = await AIProvider().complete(system_prompt, user_prompt)
    if not content or "AI provider is not configured" in content or "temporarily unavailable" in content:
        content = generate_fallback_job_description(clean_title, clean_dept, clean_exp, clean_skills)
    return {'content': content, 'review_required': True}

@router.post('/match')
async def match(payload: MatchInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    candidate = db.scalar(select(Candidate).where(Candidate.id == payload.candidate_id, Candidate.organization_id == user.organization_id))
    job = db.scalar(select(Job).where(Job.id == payload.job_id, Job.organization_id == user.organization_id))
    if not candidate or not job: raise HTTPException(404, 'Candidate or job not found')
    resume = db.scalar(select(Resume).where(Resume.candidate_id == candidate.id).order_by(Resume.id.desc()))
    if not resume: raise HTTPException(400, 'Candidate has no uploaded resume')
    job_context = f'{job.title}\n{job.department}\n{job.experience_level}\n{job.skills}\n{job.description}'
    result = await match_candidate(resume.extracted_text, job_context)
    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        parsed = {'overall_score': None, 'skills_score': None, 'experience_score': None, 'strengths': [], 'missing_skills': [], 'explanation': result}
    return {'candidate_id': candidate.id, 'job_id': job.id, **parsed, 'review_required': True}

from ..services.ai.resume_analyzer import analyze_resume, evaluate_ats_match

class AtsEvalInput(BaseModel):
    resume_text: str
    target_role: str = 'Specialist'
    target_experience: str = 'Mid-level'
    target_skills: str = ''

@router.post('/ats-eval')
async def ats_eval(payload: AtsEvalInput, _: User = Depends(current_user)):
    result = await evaluate_ats_match(payload.resume_text, payload.target_role, payload.target_experience, payload.target_skills)
    return {'result': result, 'review_required': True}

@router.post('/resume-analysis')
async def resume_analysis(payload: ResumeInput, _: User = Depends(current_user)):
    return {'content': await analyze_resume(payload.resume_text), 'review_required': True}

@router.post('/assessment')
async def assessment(payload: AssessmentInput, _: User = Depends(current_user)):
    return {'content': await generate_assessment(payload.job, payload.skills, payload.difficulty, payload.count), 'review_required': True}

@router.post('/candidate-insights')
async def insights(payload: TextInput, _: User = Depends(current_user)):
    return {'content': await candidate_insights(payload.context), 'review_required': True}

@router.post('/offer')
async def offer(payload: TextInput, _: User = Depends(current_user)):
    return {'content': await generate_offer(payload.context), 'review_required': True}
