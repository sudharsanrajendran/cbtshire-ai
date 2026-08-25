from typing import Dict, List, Any

def calculate_ats_score(
    candidate_skills: List[str],
    candidate_exp_years: float,
    candidate_title: str,
    candidate_edu: List[str],
    candidate_certs: List[str],
    job_required_skills: List[str],
    job_preferred_skills: List[str],
    job_min_exp: float,
    job_title: str,
    job_education: str = ''
) -> Dict[str, Any]:
    """
    Deterministic Backend ATS Scoring Engine based on exact matrix weights:
    - Skills Match: max 40 pts
    - Experience Match: max 25 pts
    - Job Title Match: max 15 pts
    - Education Match: max 10 pts
    - Certification Match: max 10 pts
    Total: 0 to 100
    """
    req_skills_clean = [s.strip().lower() for s in job_required_skills if s.strip()]
    pref_skills_clean = [s.strip().lower() for s in job_preferred_skills if s.strip()]
    cand_skills_clean = [s.strip().lower() for s in candidate_skills if s.strip()]

    matching_skills = []
    missing_skills = []

    for rs in req_skills_clean:
        if any(rs in cs or cs in rs for cs in cand_skills_clean):
            matching_skills.append(rs)
        else:
            missing_skills.append(rs)

    skills_score = 0.0
    if req_skills_clean:
        match_ratio = len(matching_skills) / len(req_skills_clean)
        skills_score = round(match_ratio * 40.0, 1)
    else:
        skills_score = 40.0

    pref_matches = [ps for ps in pref_skills_clean if any(ps in cs or cs in ps for cs in cand_skills_clean)]
    if pref_skills_clean:
        skills_score = min(40.0, round(skills_score + (len(pref_matches) / len(pref_skills_clean)) * 5.0, 1))

    exp_score = 25.0
    if job_min_exp > 0:
        if candidate_exp_years >= job_min_exp:
            exp_score = 25.0
        elif candidate_exp_years > 0:
            exp_score = round((candidate_exp_years / job_min_exp) * 25.0, 1)
        else:
            exp_score = 10.0

    title_score = 5.0
    cand_t = candidate_title.strip().lower()
    job_t = job_title.strip().lower()

    if cand_t and job_t:
        if cand_t == job_t:
            title_score = 15.0
        elif any(word in cand_t for word in job_t.split() if len(word) > 2) or any(word in job_t for word in cand_t.split() if len(word) > 2):
            title_score = 12.0
        else:
            title_score = 8.0

    edu_score = 8.0
    if candidate_edu:
        edu_score = 10.0

    cert_score = 5.0
    if candidate_certs:
        cert_score = 10.0

    total_score = min(100, int(round(skills_score + exp_score + title_score + edu_score + cert_score)))
    is_shortlisted = total_score >= 70

    explanation = (
        f"Candidate scored {total_score}/100 ATS match for {job_title}. "
        f"Skills score: {skills_score}/40, Experience score: {exp_score}/25, Title score: {title_score}/15. "
        f"{'Candidate meets key requirements and is shortlisted (Score >= 70).' if is_shortlisted else 'Candidate requires further skill alignment.'}"
    )

    return {
        "ats_score": total_score,
        "is_shortlisted": is_shortlisted,
        "score_breakdown": {
            "skills_score": skills_score,
            "skills_max": 40,
            "experience_score": exp_score,
            "experience_max": 25,
            "title_score": title_score,
            "title_max": 15,
            "education_score": edu_score,
            "education_max": 10,
            "certification_score": cert_score,
            "certification_max": 10
        },
        "matching_skills": [s.title() for s in matching_skills],
        "missing_skills": [s.title() for s in missing_skills],
        "explanation": explanation
    }
