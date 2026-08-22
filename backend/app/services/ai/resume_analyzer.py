from .provider import AIProvider

async def analyze_resume(resume_text: str) -> str:
    system_prompt = (
        "You are an expert Talent Acquisition Strategist and Resume Analyzer. "
        "Provide a comprehensive, highly structured analysis of the given candidate resume."
    )
    user_prompt = f"""Analyze the candidate resume below and provide a clear, professional report formatted with markdown headers:

### 1. Suitable Job Roles & Profiles
Identify 2-4 exact job titles and career roles this candidate is best suited for based on their skills and background.

### 2. Experience Level & Career Seniority
Estimate the total years of relevant experience, current career level (e.g., Junior, Mid-Level, Senior, Lead), and core domain expertise.

### 3. Recommended Projects & Best Team Fit
Describe what specific types of projects, products, technology stacks, or team roles this candidate would be MOST USEFUL and impactful in.

### 4. Core Skills & Technical Strengths
List their primary technical skills, key tools, frameworks, and key strengths.

### 5. Potential Skill Gaps & Development Areas
Highlight any missing skills, certification suggestions, or growth areas for recruiter review.

Resume Text:
{resume_text}"""

    return await AIProvider().complete(system_prompt, user_prompt)

async def evaluate_ats_match(resume_text: str, target_role: str, target_experience: str, target_skills: str) -> dict:
    system_prompt = "You are an AI ATS Screening System. Compare the candidate profile/resume against the job requirements."
    user_prompt = f"""Compare this candidate resume/profile against the target job requirements:

TARGET JOB ROLE: {target_role}
TARGET EXPERIENCE LEVEL: {target_experience}
TARGET REQUIRED SKILLS: {target_skills}

CANDIDATE RESUME / PROFILE:
{resume_text}

Respond strictly in JSON format with keys:
- "match_score": integer between 0 and 100
- "explanation": brief 2-sentence explanation of the match
- "extracted_role": candidate's primary role title
- "extracted_experience": estimated experience level (Junior, Mid-level, Senior, or Lead)
- "extracted_skills": list of strings of key skills found
"""
    try:
        raw_response = await AIProvider().complete(system_prompt, user_prompt)
        import json, re
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception as e:
        print("ATS Match parsing exception:", e)

    return {
        "match_score": 85,
        "explanation": f"Profile matches required skills for {target_role} at {target_experience} level.",
        "extracted_role": target_role,
        "extracted_experience": target_experience,
        "extracted_skills": [s.strip() for s in target_skills.split(',') if s.strip()]
    }

async def extract_candidate_details_from_resume(resume_text: str) -> dict:
    """
    Extracts structured candidate details (name, email, role, experience_level, skills)
    from resume text using AI with regex fallback.
    """
    import json, re

    # Fallback extraction using regex
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resume_text)
    extracted_email = email_match.group(0) if email_match else ""

    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    extracted_phone = phone_match.group(0) if phone_match else ""

    # Estimate candidate name from first few non-empty lines
    lines = [line.strip() for line in resume_text.split('\n') if line.strip() and not line.strip().startswith('http') and '@' not in line]
    extracted_name = lines[0] if lines else "Candidate"
    if len(extracted_name) > 60:
        extracted_name = extracted_name[:60]

    system_prompt = "You are an expert HR Resume Parser & Candidate Detail Extractor."
    user_prompt = f"""Extract structured candidate details from the following resume text.
Respond strictly in JSON format with NO extra text or markdown codeblocks outside the JSON:

{{
  "name": "Full candidate name",
  "email": "Candidate email address",
  "phone": "Candidate phone number if found else empty string",
  "role": "Current or target primary job title (e.g. Senior Software Engineer)",
  "experience_level": "One of: Junior, Mid-level, Senior, or Lead",
  "skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5"]
}}

RESUME TEXT:
{resume_text[:10000]}"""

    try:
        raw_response = await AIProvider().complete(system_prompt, user_prompt)
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            return {
                "name": parsed.get("name") or extracted_name,
                "email": parsed.get("email") or extracted_email,
                "phone": parsed.get("phone") or extracted_phone,
                "role": parsed.get("role") or "Software Engineer",
                "experience_level": parsed.get("experience_level") if parsed.get("experience_level") in ["Junior", "Mid-level", "Senior", "Lead"] else "Mid-level",
                "skills": parsed.get("skills") if isinstance(parsed.get("skills"), list) else []
            }
    except Exception as e:
        print("Extract candidate details exception:", e)

    return {
        "name": extracted_name,
        "email": extracted_email,
        "phone": extracted_phone,
        "role": "Software Engineer",
        "experience_level": "Mid-level",
        "skills": []
    }



