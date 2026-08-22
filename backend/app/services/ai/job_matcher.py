from .provider import AIProvider
async def match_candidate(resume_text: str, job_requirements: str) -> str:
    return await AIProvider().complete('You assist recruiters; provide evidence-based matching only and never make hiring decisions. Return valid JSON only with keys overall_score, skills_score, experience_score, strengths (array), missing_skills (array), and explanation. Do not use protected characteristics.', f'Compare this resume and job. Scores must be integers from 0 to 100. Resume:\n{resume_text}\nJob:\n{job_requirements}')
