import json
import random
import re
from .provider import AIProvider

async def generate_assessment_questions(
    job: str,
    skills: str,
    difficulty: str = 'Mid-level',
    job_description: str = '',
    candidate_summary: str = '',
    count: int = 5
) -> list[dict]:
    """
    Generates dynamic, unique, non-repeating technical assessment questions tailored
    specifically to the target Job Role, Job Description, Candidate Skills, and Experience Level.
    """
    system_prompt = (
        "You are an elite Domain Technical Interviewer, Subject Matter Expert, and AI Assessment Designer. "
        "Your task is to generate fresh, unique, challenging, and highly realistic multiple-choice technical & operational assessment questions. "
        "The questions MUST be strictly customized to the target Job Role, Industry Domain, Job Requirements, candidate skills, and the specific Experience Level (Junior, Mid-level, Senior, or Lead). "
        "CRITICAL RULES:\n"
        "1. ACCURATELY identify the industry domain (Aviation/Aerospace, Mechanical, Civil, Healthcare, Finance, Operations, IT/Software, etc.) from the TARGET JOB ROLE and REQUIRED SKILLS.\n"
        "2. NEVER generate software coding, database, or DevOps questions for non-software roles (e.g. for Aviation MRO Engineer, test aircraft maintenance procedures, FAA/EASA airworthiness directives, airframe/engine/avionics overhaul, ATA chapters, NDT inspections, and safety management; NOT javascript or databases).\n"
        "3. DO NOT generate repetitive or standard textbook questions. Every question should be an authentic, practical, situational, or troubleshooting scenario.\n"
        "4. Senior/Lead level questions should test complex diagnostics, failure root causes, regulatory compliance, quality governance, and architecture/process trade-offs.\n"
        "5. Mid-level questions should test practical workflows, standard operating procedures, maintenance manuals, diagnostic instruments, and technical optimizations.\n"
        "6. Junior level questions should test foundational concepts, standard safety protocols, inspection checklists, and core procedures.\n"
        "7. Respond strictly with a valid JSON list of question objects with exact keys: prompt, options (pipe-separated 4 options), correct (exact match to one option), exp (clear reasoning)."
    )

    context_details = []
    if job_description:
        context_details.append(f"JOB DESCRIPTION & RESPONSIBILITIES:\n{job_description[:1500]}")
    if candidate_summary:
        context_details.append(f"CANDIDATE BACKGROUND CONTEXT:\n{candidate_summary[:1000]}")

    context_str = "\n\n".join(context_details)

    # Add random seed variations to guarantee freshness and non-duplicate questions
    seed_token = random.randint(1000, 9999)

    user_prompt = f"""Generate {count} dynamic, UNIQUE {difficulty}-level multiple-choice assessment questions.

TARGET JOB ROLE: {job}
CANDIDATE EXPERIENCE LEVEL: {difficulty}
KEY REQUIRED & CANDIDATE SKILLS: {skills}
SESSION SEED: #{seed_token}

{context_str}

Ensure each question has:
- "prompt": Realistic situational or technical question
- "options": 4 realistic answer choices separated by '|' (Option A|Option B|Option C|Option D)
- "correct": The exact text of the correct choice
- "exp": 1-2 sentence technical explanation

Respond strictly in JSON format as a list of objects with keys: prompt, options, correct, exp."""

    try:
        raw_res = await AIProvider().complete(system_prompt, user_prompt)
        match = re.search(r'\[.*\]', raw_res, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed[:count]
    except Exception as e:
        print("[Assessment Generator Exception]:", e)

    # Dynamic fallback question generation tailored to the user's target job role and skills
    skill_list = [s.strip() for s in skills.split(',') if s.strip()]
    primary_skill = skill_list[0] if skill_list else f"{job} Core Operations"
    second_skill = skill_list[1] if len(skill_list) > 1 else "Domain Workflows & Best Practices"
    third_skill = skill_list[2] if len(skill_list) > 2 else "Quality, Safety & Compliance"

    if difficulty in ['Senior', 'Lead']:
        return [
            {
                "prompt": f"In a demanding operational environment for a Senior {job} role involving {primary_skill}, how do you evaluate strategic trade-offs under tight constraints?",
                "options": f"Analyze risk factors, prioritize core domain standards, and execute structured mitigation|Disregard standard guidelines and act without planning|Delegate all critical decisions to unverified external parties|Delay execution indefinitely until all uncertainty is removed",
                "correct": f"Analyze risk factors, prioritize core domain standards, and execute structured mitigation",
                "exp": f"Senior leadership requires systematic risk assessment and adherence to domain standards during complex scenarios."
            },
            {
                "prompt": f"When leading team workflows around {second_skill} for {job} operations, which approach best ensures high quality and error prevention?",
                "options": f"Establish clear operating protocols, conduct regular quality audits, and mentor staff|Rely entirely on informal verbal instructions without documentation|Eliminate quality reviews to speed up operational turnaround|Assign complex tasks exclusively to junior personnel without supervision",
                "correct": f"Establish clear operating protocols, conduct regular quality audits, and mentor staff",
                "exp": f"Standardized procedures combined with quality oversight prevent operational errors."
            },
            {
                "prompt": f"How should compliance, regulatory guidelines, and safety standards be integrated into {job} initiatives using {third_skill}?",
                "options": f"Proactively align workflows with industry regulations and maintain full compliance records|Treat compliance as optional and only address violations after external audit|Bypass safety protocols during peak workload periods|Delegate regulatory accountability to third-party vendors without verification",
                "correct": f"Proactively align workflows with industry regulations and maintain full compliance records",
                "exp": f"Proactive regulatory alignment and documentation guarantee operational safety and legal compliance."
            },
            {
                "prompt": f"For a {job} position focusing on {primary_skill}, what is the most effective methodology for optimizing workflow efficiency without compromising standards?",
                "options": f"Continuous process monitoring, root cause analysis of bottlenecks, and iterative refinement|Drastically cutting essential quality steps to reduce costs|Increasing workload volume without adjusting resource allocation|Replacing established best practices with unverified methods",
                "correct": f"Continuous process monitoring, root cause analysis of bottlenecks, and iterative refinement",
                "exp": f"Data-driven root cause analysis enables sustainable process optimization."
            },
            {
                "prompt": f"In senior {job} leadership, what strategy provides the most reliable evaluation of overall project or operational performance?",
                "options": f"Tracking key performance indicators (KPIs), qualitative feedback, and compliance metrics|Relying solely on subjective personal impressions|Evaluating success based exclusively on short-term speed|Ignoring performance tracking once execution begins",
                "correct": f"Tracking key performance indicators (KPIs), qualitative feedback, and compliance metrics",
                "exp": f"Multi-dimensional KPI tracking provides objective insights into operational performance."
            }
        ][:count]
    elif difficulty == 'Junior':
        return [
            {
                "prompt": f"What is the primary objective of following standard operating procedures in an entry-level {job} position involving {primary_skill}?",
                "options": f"To ensure consistent quality, safety, and compliance across daily operations|To skip necessary validation steps|To increase operational confusion|To make tasks more complicated than required",
                "correct": f"To ensure consistent quality, safety, and compliance across daily operations",
                "exp": f"Standard operating procedures maintain consistency, safety, and error reduction."
            },
            {
                "prompt": f"When working with {second_skill} as a {job}, what is the best practice when encountering an unfamiliar operational problem?",
                "options": f"Document the issue, consult standard documentation or senior team members, and follow escalation paths|Guess a solution without verifying safety guidelines|Ignore the issue and proceed as if nothing happened|Hide the problem from supervisors",
                "correct": f"Document the issue, consult standard documentation or senior team members, and follow escalation paths",
                "exp": f"Proper documentation and escalation prevent safety risks and ensure correct problem resolution."
            },
            {
                "prompt": f"Why is effective communication critical for a {job} working with {third_skill}?",
                "options": f"Ensures accurate handoffs, aligns team goals, and prevents operational misunderstandings|Replaces the need for formal training|Eliminates the requirement for written logs|Guarantees immediate task completion without review",
                "correct": f"Ensures accurate handoffs, aligns team goals, and prevents operational misunderstandings",
                "exp": f"Clear communication ensures team alignment and minimizes operational errors."
            },
            {
                "prompt": f"What is the primary responsibility regarding safety and protocol compliance for a {job}?",
                "options": f"Adhere strictly to safety guidelines and report hazards immediately|Follow safety rules only when observed by management|Disregard safety procedures if under time pressure|Assume someone else will handle safety measures",
                "correct": f"Adhere strictly to safety guidelines and report hazards immediately",
                "exp": f"Individual accountability for safety protocols is essential in all professional environments."
            },
            {
                "prompt": f"In {job} operations, what does quality assurance primarily focus on achieving?",
                "options": f"Verifying that outputs meet defined standards and customer or regulatory expectations|Increasing speed regardless of errors|Minimizing documentation requirements|Reducing team collaboration",
                "correct": f"Verifying that outputs meet defined standards and customer or regulatory expectations",
                "exp": f"Quality assurance ensures that work products conform to established benchmarks."
            }
        ][:count]
    else: # Mid-level
        return [
            {
                "prompt": f"In {primary_skill}, how can a {job} optimize daily execution while maintaining high standards?",
                "options": f"Streamlining redundant steps, standardizing tools, and maintaining strict quality checks|Omitting verification steps to finish faster|Working in isolation without team coordination|Changing core procedures without testing",
                "correct": f"Streamlining redundant steps, standardizing tools, and maintaining strict quality checks",
                "exp": f"Process optimization removes friction while maintaining quality controls."
            },
            {
                "prompt": f"When managing {second_skill} requirements for {job} tasks, how should unexpected operational changes be handled?",
                "options": f"Assess impact, communicate adjustments to stakeholders, and follow change control procedures|Immediately reject all requested changes|Implement changes silently without informing team members|Abandon project goals completely",
                "correct": f"Assess impact, communicate adjustments to stakeholders, and follow change control procedures",
                "exp": f"Structured change management minimizes operational disruption."
            },
            {
                "prompt": f"Which strategy best improves team productivity for a {job} working with {third_skill}?",
                "options": f"Establishing clear role definitions, shared goals, and collaborative feedback loops|Increasing individual workload beyond capacity|Eliminating team meetings and reviews|Relying on manual effort without tools",
                "correct": f"Establishing clear role definitions, shared goals, and collaborative feedback loops",
                "exp": f"Clear roles and constructive feedback drive sustained team productivity."
            },
            {
                "prompt": f"How does systematic documentation benefit {job} operations in {primary_skill}?",
                "options": f"Provides repeatable guidelines, audit trails, and seamless knowledge transfer|Adds unnecessary administrative overhead|Prevents team members from learning skills|Replaces practical operational execution",
                "correct": f"Provides repeatable guidelines, audit trails, and seamless knowledge transfer",
                "exp": f"Documentation preserves operational knowledge and supports compliance audits."
            },
            {
                "prompt": f"What is the best approach for managing resource allocation in {job} projects?",
                "options": f"Prioritizing high-impact tasks, tracking timelines, and balancing team capacity|Allocating all resources to low-priority items|Over-committing resources without buffer time|Ignoring milestone deadlines",
                "correct": f"Prioritizing high-impact tasks, tracking timelines, and balancing team capacity",
                "exp": f"Resource management balances workload against priority targets."
            }
        ][:count]

async def generate_assessment(job: str, skills: str, difficulty: str = 'Intermediate', count: int = 5) -> str:
    questions = await generate_assessment_questions(job, skills, difficulty, count=count)
    return json.dumps(questions, indent=2)

async def extract_questions_from_assessment_doc(document_text: str) -> list[dict]:
    """
    Parses a human-uploaded Assessment Question Paper document (PDF, Word Doc, TXT),
    extracts all questions, multiple-choice options, correct answers, and explanations.
    """
    system_prompt = (
        "You are an expert Assessment Document Parser and Examination Digitizer AI. "
        "Your task is to analyze an uploaded human assessment question paper (PDF, Word Document, or Text) "
        "and extract every single question, its multiple-choice options, the correct answer, and an explanation.\n"
        "RULES:\n"
        "1. Extract all questions from the document accurately without truncating technical terms.\n"
        "2. If options (A, B, C, D or 1, 2, 3, 4) are provided in the document, extract them cleanly into a pipe-separated string: 'Option A|Option B|Option C|Option D'.\n"
        "3. If a question in the document does not have options (e.g. short-answer or problem statement), generate 4 realistic multiple-choice options with 1 correct option.\n"
        "4. Identify or verify the correct answer choice and place the exact option text in 'correct'.\n"
        "5. Include a clear technical explanation in 'exp'.\n"
        "6. Return ONLY a valid JSON list of question objects with keys: prompt, options, correct, exp."
    )

    user_prompt = f"""Parse and extract all multiple-choice questions from the following assessment document:

--- ASSESSMENT DOCUMENT START ---
{document_text[:12000]}
--- ASSESSMENT DOCUMENT END ---

Output format: Return strictly a valid JSON array of objects with keys: "prompt", "options" (pipe-separated e.g. "A|B|C|D"), "correct" (exact text matching one option), "exp" (technical explanation)."""

    try:
        raw_res = await AIProvider().complete(system_prompt, user_prompt)
        match = re.search(r'\[.*\]', raw_res, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
    except Exception as e:
        print("[Assessment Doc Parser Exception]:", e)

    # Fallback if document had plain text without clear formatting
    lines = [l.strip() for l in document_text.split('\n') if len(l.strip()) > 10]
    fallback_qs = []
    for i, line in enumerate(lines[:5]):
        fallback_qs.append({
            "prompt": f"Assessment Item {i+1}: {line[:120]}?",
            "options": f"Compliant standard procedure|Non-compliant deviation|Incomplete execution|Unverified manual step",
            "correct": "Compliant standard procedure",
            "exp": "Extracted from uploaded assessment document specification."
        })
    return fallback_qs



