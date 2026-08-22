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
    role_title = title.strip() if title and title.strip() else "Professional"
    dept = department.strip() if department and department.strip() else "Engineering"
    exp = experience.strip() if experience and experience.strip() else "2-4 years"
    
    # Get authentic domain skills if not provided
    if skills and skills.strip():
        skills_list = [s.strip() for s in skills.split(',') if s.strip()]
    else:
        skills_list = get_smart_skills_for_role(role_title, dept)
    
    skills_str = ", ".join(skills_list)
    bullets = "\n".join([f"• Demonstrated hands-on proficiency in **{s}**" for s in skills_list])
    lookup = f"{role_title} {dept}".lower()

    # 1. SOFTWARE & TECH ROLES (Java, Flutter, React, Python, Backend, Frontend, DevOps, etc.)
    is_tech = any(k in lookup for k in ['java', 'python', 'flutter', 'react', 'developer', 'engineer', 'frontend', 'backend', 'fullstack', 'software', 'node', 'web', 'devops', 'qa', 'data', 'cloud'])
    if is_tech and 'civil' not in lookup and 'mechanical' not in lookup and 'aviation' not in lookup:
        return f"""### About the Role: {role_title}
We are seeking an experienced and dedicated **{role_title}** to join our **{dept}** engineering team. In this position, you will be responsible for designing, developing, and deploying scalable, high-performance applications and backend/frontend systems utilizing **{skills_str}**.

### Key Responsibilities:
• Design, build, and maintain clean, scalable, and testable code for {role_title} workflows.
• Architect and integrate robust RESTful APIs, microservices, and database models using **{skills_str}**.
• Collaborate with cross-functional engineering teams, UI/UX designers, and product managers to deliver features.
• Write comprehensive automated unit and integration tests to ensure software stability and performance.
• Troubleshoot production bugs, conduct thorough peer code reviews, and optimize application latency.
• Champion continuous integration, continuous delivery (CI/CD), and modern agile best practices.

### Required Qualifications & Experience:
• **Experience:** {exp} of proven industry experience in software engineering and application development.
• **Core Technical Skills:**
{bullets}
• Strong foundation in Object-Oriented Programming (OOP), software design patterns, and data structures.
• Hands-on proficiency with Git version control and modern developer tooling.
• Excellent analytical, debugging, and problem-solving abilities.

### Preferred Qualifications:
• Bachelor's or Master's degree in Computer Science, Information Technology, or equivalent practical experience.
• Familiarity with cloud platforms (AWS / Azure / GCP) and containerization (Docker).

### What We Offer:
• Highly competitive compensation and benefits package.
• Opportunity to work on cutting-edge technology and impactful software products.
• Clear career progression pathways and continuous learning opportunities."""

    # 2. AVIATION & AEROSPACE ROLES
    if any(k in lookup for k in ['aviation', 'aircraft', 'mro', 'avionics', 'pilot', 'aerospace']):
        return f"""### About the Role: {role_title}
We are seeking a qualified and certified **{role_title}** to join our **{dept}** team. In this role, you will perform aircraft line and base maintenance, airframe and powerplant inspections, avionics troubleshooting, and ensure full compliance with civil aviation regulations utilizing **{skills_str}**.

### Key Responsibilities:
• Perform scheduled and unscheduled line maintenance, structural inspections, and system repairs on aircraft.
• Inspect, test, and troubleshoot airframe, powerplant, and avionics components per manufacturer Aircraft Maintenance Manuals (AMM).
• Ensure all maintenance tasks strictly comply with FAA / EASA / DGCA regulatory airworthiness standards.
• Accurately sign off maintenance release certificates, technical logbooks, and work orders.
• Uphold strict hangar safety procedures, Foreign Object Debris (FOD) prevention, and tool accountability.

### Required Qualifications & Experience:
• **Experience:** {exp} of hands-on aircraft maintenance experience.
• **Core Domain Skills:**
{bullets}
• Valid A&P License, EASA Part-66 AME License, or relevant civil aviation certification.
• In-depth knowledge of aircraft systems, maintenance documentation, and quality assurance.

### Preferred Qualifications:
• Specific aircraft type ratings and recurrent regulatory training certificates.

### What We Offer:
• Competitive compensation, shift allowances, and comprehensive medical insurance.
• Professional aircraft type rating training and career growth opportunities."""

    # 3. HEALTHCARE & MEDICAL ROLES
    if any(k in lookup for k in ['nurse', 'doctor', 'medical', 'hospital', 'clinical', 'healthcare', 'physician']):
        return f"""### About the Role: {role_title}
We are seeking a compassionate and licensed **{role_title}** to join our **{dept}** healthcare team. In this position, you will deliver high-quality patient care, conduct assessments, and administer medical treatments using **{skills_str}**.

### Key Responsibilities:
• Provide comprehensive patient care, monitor vital signs, and administer medications per physician orders.
• Conduct thorough clinical assessments and document patient history accurately in Electronic Health Records (EHR).
• Collaborate with multidisciplinary healthcare teams to formulate and execute customized patient care plans.
• Maintain strict adherence to infection control protocols, HIPAA compliance, and clinical safety standards.
• Educate patients and their families on post-treatment care, recovery protocols, and wellness practices.

### Required Qualifications & Experience:
• **Experience:** {exp} of clinical experience in an accredited hospital or healthcare setting.
• **Core Clinical Skills:**
{bullets}
• Active state medical/nursing license and valid BLS / ACLS certification.

### What We Offer:
• Comprehensive healthcare benefits, retirement plan, and competitive pay structure.
• Continuing Medical Education (CME) assistance and professional growth programs."""

    # 4. DEFAULT COMPREHENSIVE DOMAIN TEMPLATE
    return f"""### About the Role: {role_title}
We are seeking a talented and driven **{role_title}** to join our **{dept}** team. In this position, you will lead key operational and strategic initiatives, execute domain-specific workflows, and deliver measurable outcomes utilizing **{skills_str}**.

### Key Responsibilities:
• Execute end-to-end responsibilities and project deliverables for {role_title}.
• Apply core expertise in **{skills_str}** to optimize efficiency, quality, and performance.
• Collaborate with cross-functional stakeholders to align on strategic objectives and timelines.
• Analyze operational data, troubleshoot challenges, and implement sustainable continuous improvements.
• Document standard operating procedures (SOPs) and ensure strict compliance with industry standards.

### Required Qualifications & Experience:
• **Experience:** {exp} of relevant industry experience in {dept} or related domains.
• **Core Domain Skills:**
{bullets}
• Strong analytical, strategic thinking, and problem-solving capabilities.
• Excellent communication, presentation, and stakeholder collaboration skills.

### Preferred Qualifications:
• Relevant professional certifications or degree related to {role_title}.
• Demonstrated track record of delivering successful projects in high-growth environments.

### What We Offer:
• Competitive compensation, bonus structure, and comprehensive wellness benefits.
• Clear career advancement pathways and supportive team culture."""

DOMAIN_SKILLS_MAP = {
    'flutter': ['Flutter', 'Dart', 'Riverpod / BLoC', 'REST APIs', 'Firebase', 'State Management', 'Git', 'App Store & Play Store Publishing'],
    'react': ['React.js', 'TypeScript', 'Next.js', 'Redux Toolkit / Zustand', 'Tailwind CSS', 'REST / GraphQL APIs', 'HTML5 & CSS3', 'Vite / Webpack'],
    'frontend': ['JavaScript (ES6+)', 'TypeScript', 'React / Vue', 'CSS3 & Responsive Design', 'HTML5 Semantic Markup', 'REST APIs', 'Web Performance Optimization'],
    'backend': ['Python / Node.js', 'RESTful API Design', 'PostgreSQL / MySQL', 'Redis & Caching', 'Docker', 'Authentication (JWT/OAuth)', 'Microservices Architecture'],
    'python': ['Python 3', 'FastAPI / Django', 'PostgreSQL', 'SQLAlchemy / ORM', 'Docker', 'REST APIs', 'Celery & Redis', 'Unit Testing (pytest)'],
    'java': ['Java 17+', 'Spring Boot', 'Microservices', 'Hibernate / JPA', 'PostgreSQL / Oracle', 'Kafka', 'Maven / Gradle', 'Docker'],
    'node': ['Node.js', 'Express.js / NestJS', 'TypeScript', 'MongoDB / PostgreSQL', 'RESTful APIs', 'JWT Authentication', 'Redis', 'Docker'],
    'aviation': ['Aircraft Maintenance (A&P)', 'FAA / EASA Regulations', 'Line & Base Maintenance', 'Avionics Diagnostics', 'Airframe & Powerplant Inspection', 'Standard Operating Procedures'],
    'aircraft': ['Aircraft Maintenance (A&P)', 'FAA / EASA Regulations', 'Airframe Overhaul', 'Powerplant Inspection', 'Avionics Systems', 'Safety Compliance'],
    'mro': ['MRO Operations', 'Aviation Safety Regulations', 'Structural Airframe Repair', 'Engine Overhaul', 'Component Diagnostics', 'Technical Logbook Documentation'],
    'mechanical': ['SolidWorks / CATIA', 'Thermodynamics', 'Finite Element Analysis (FEA)', 'GD&T', 'Manufacturing Processes', 'HVAC Systems', 'Materials Engineering'],
    'civil': ['AutoCAD', 'STAAD Pro / ETABS', 'Structural Design', 'Construction Site Management', 'Quantity Estimation', 'Concrete & Steel Standards', 'Surveying'],
    'electrical': ['Circuit Design & PCB', 'MATLAB / Simulink', 'Power Systems', 'PLC Programming', 'AutoCAD Electrical', 'Safety Compliance (IEEE/IEC)', 'Microcontrollers'],
    'doctor': ['Clinical Diagnosis', 'Patient Care & Assessment', 'Medical Record Documentation', 'Emergency Medical Procedures', 'Treatment Planning', 'Pharmacology'],
    'nurse': ['Patient Care', 'Vital Signs Monitoring', 'Medication Administration', 'BLS / ACLS Certification', 'Clinical Charting (EHR)', 'Wound Care & Infection Control'],
    'healthcare': ['Patient Assessment', 'Healthcare Compliance (HIPAA)', 'Clinical Protocols', 'Medical Terminology', 'Electronic Health Records (EHR)', 'Patient Safety'],
    'digital marketing': ['Search Engine Optimization (SEO)', 'Google Ads / PPC', 'Meta Ads Manager', 'Google Analytics 4', 'Content Strategy', 'Copywriting & Campaign Optimization'],
    'marketing': ['Digital Marketing Strategy', 'SEO & Content Marketing', 'Social Media Management', 'Campaign Analytics (GA4)', 'Brand Development', 'Email Marketing Automation'],
    'sales': ['B2B Sales Outreach', 'Lead Generation & Prospecting', 'CRM (Salesforce / HubSpot)', 'Client Relationship Management', 'Negotiation & Closing', 'Pipeline Tracking'],
    'business development': ['Market Research & Expansion', 'B2B Client Acquisition', 'Partnership Building', 'Lead Generation', 'Contract Negotiation', 'Revenue Forecasting'],
    'accountant': ['Financial Statement Preparation', 'General Ledger & Journal Entries', 'Tax Compliance & Filing', 'QuickBooks / Tally ERP', 'Accounts Payable & Receivable', 'Auditing & Reconciliation'],
    'finance': ['Financial Modeling & Valuation', 'Budgeting & Forecasting', 'Excel (Advanced Formulas & Pivot)', 'Financial Reporting', 'Risk Management', 'Variance Analysis'],
    'graphic designer': ['Adobe Photoshop', 'Adobe Illustrator', 'Typography & Layout Design', 'Branding & Identity', 'Figma', 'Visual Storytelling', 'Print & Digital Production'],
    'ui/ux': ['Figma / Adobe XD', 'Wireframing & Prototyping', 'User Research & Personas', 'Design Systems', 'Usability Testing', 'Information Architecture', 'Interaction Design'],
    'product manager': ['Product Roadmap Development', 'Agile / Scrum Methodology', 'User Story Writing & Backlog Grooming', 'Market & Competitor Analysis', 'Data-Driven Prioritization', 'A/B Testing & Product Metrics'],
    'project manager': ['Project Planning & Scheduling', 'Agile / Scrum / Waterfall', 'Risk Management & Mitigation', 'Resource Allocation & Budgeting', 'Stakeholder Management', 'Jira / Asana / MS Project'],
    'human resources': ['Talent Acquisition & Sourcing', 'Candidate Screening & Interviewing', 'Employee Onboarding & Relations', 'HR Compliance & Labor Laws', 'HRIS / ATS Management', 'Performance Management'],
    'hr': ['Talent Sourcing & Recruitment', 'ATS Systems Management', 'Interview Coordination', 'Employee Engagement & Relations', 'Onboarding & Induction', 'HR Policies & Documentation'],
    'data scientist': ['Python & R', 'Machine Learning (Scikit-Learn, XGBoost)', 'Pandas, NumPy & Data Wrangling', 'SQL & Relational Databases', 'Data Visualization (Tableau / PowerBI)', 'Statistical Modeling & Hypothesis Testing'],
    'data analyst': ['SQL (Complex Queries & Joins)', 'PowerBI / Tableau', 'Advanced Microsoft Excel', 'Data Cleaning & Preprocessing', 'Business Intelligence Reporting', 'Exploratory Data Analysis (EDA)'],
    'devops': ['CI/CD Pipelines (GitHub Actions / GitLab)', 'Docker & Kubernetes', 'AWS / Azure Cloud Services', 'Infrastructure as Code (Terraform)', 'Linux System Administration', 'Monitoring (Prometheus & Grafana)', 'Bash Scripting'],
    'qa': ['Manual Test Case Design', 'Automated Testing (Selenium / Cypress / Playwright)', 'API Testing (Postman)', 'Bug Tracking (Jira)', 'Regression & Smoke Testing', 'Quality Assurance Best Practices'],
    'teacher': ['Curriculum Planning & Development', 'Classroom Management', 'Student Assessment & Evaluation', 'Differentiated Instruction', 'Educational Technology Tools', 'Parent-Teacher Communication']
}

def get_smart_skills_for_role(title: str, dept: str) -> list[str]:
    lookup = f"{title} {dept}".lower()
    for key, skills in DOMAIN_SKILLS_MAP.items():
        if key in lookup:
            return skills
    # Partial token matching
    tokens = lookup.split()
    for token in tokens:
        if len(token) >= 3 and token in DOMAIN_SKILLS_MAP:
            return DOMAIN_SKILLS_MAP[token]
    return [
        f"{title.strip().title()} Core Execution",
        "Industry Best Practices",
        "Quality & Safety Compliance",
        "Process Optimization",
        "Cross-functional Collaboration",
        "Technical Reporting & Documentation"
    ]

@router.post('/suggest-skills')
async def suggest_skills(payload: SuggestSkillsInput):
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
        print("[Suggest Skills AI Error]:", e)

    # Fallback to authentic domain-specific dictionary
    fallback_skills = get_smart_skills_for_role(clean_title, clean_dept)
    return {
        'skills': fallback_skills,
        'skills_str': ', '.join(fallback_skills),
        'role': clean_title
    }

@router.post('/job-description')
async def job_description(payload: JobDescriptionInput):
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
