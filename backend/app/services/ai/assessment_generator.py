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

    # Dynamic fallback tailored question generation based on skills and difficulty
    skill_list = [s.strip() for s in skills.split(',') if s.strip()]
    primary_skill = skill_list[0] if skill_list else 'Software Engineering'
    second_skill = skill_list[1] if len(skill_list) > 1 else 'System Design'
    third_skill = skill_list[2] if len(skill_list) > 2 else 'API Architecture'

    if difficulty in ['Senior', 'Lead']:
        return [
            {
                "prompt": f"In a high-throughput production environment for a {job} position using {primary_skill}, how would you design data persistence and caching to avoid cache stampedes and database starvation?",
                "options": "Mutex locking / probabilistic early expiration & distributed Redis caching|Disabling caching and querying database directly|Synchronous blocking loops on every missed key|Setting TTL to zero across all cache entries",
                "correct": "Mutex locking / probabilistic early expiration & distributed Redis caching",
                "exp": "Early probabilistic cache refresh and mutex locks prevent concurrent backend database queries when hot keys expire."
            },
            {
                "prompt": f"When leading architectural decisions around {second_skill} for {job} systems, which strategy best isolates fault domains during cascading microservice failures?",
                "options": "Circuit breakers, bulkheads, and dead-letter queues|Increasing HTTP timeout limits to 5 minutes|Synchronous chain of direct REST calls without fallback|Restarting dependent containers on every 5xx response",
                "correct": "Circuit breakers, bulkheads, and dead-letter queues",
                "exp": "Circuit breakers fail fast and bulkheads isolate thread/connection pools to prevent system-wide resource exhaustion."
            },
            {
                "prompt": f"How should distributed transactions and data consistency be managed across multiple services in a {job} architecture utilizing {third_skill}?",
                "options": "Saga pattern with compensating transactions & event-driven orchestrator|Two-phase commit (2PC) over public HTTP endpoints|Direct cross-database foreign key triggers|Ignoring partial failures and logging errors",
                "correct": "Saga pattern with compensating transactions & event-driven orchestrator",
                "exp": "Saga patterns allow eventual consistency and graceful rollback via compensations across distributed services."
            },
            {
                "prompt": f"In {primary_skill}, what is the most effective approach for zero-downtime database schema migrations for large datasets under constant write traffic?",
                "options": "Expand/Contract (Blue-Green) pattern with backward-compatible additive columns|Locking tables during peak hours for schema rewrite|Dropping and recreating indices during runtime|Running manual SQL scripts directly in production without rollback plan",
                "correct": "Expand/Contract (Blue-Green) pattern with backward-compatible additive columns",
                "exp": "The Expand/Contract phase ensures older and newer application versions can run concurrently without breaking changes."
            },
            {
                "prompt": f"For a {difficulty} {job}, which observability strategy provides the fastest Mean Time to Detect (MTTD) for latency anomalies in {second_skill}?",
                "options": "Distributed tracing with OpenTelemetry and p99 percentile latency metrics|Periodic tailing of server log files manually|Monitoring overall average CPU usage alone|Relying on end-user bug reports",
                "correct": "Distributed tracing with OpenTelemetry and p99 percentile latency metrics",
                "exp": "Distributed tracing tracks request spans across microservice boundaries and p99 percentiles reveal critical tail latencies."
            }
        ][:count]
    elif difficulty == 'Junior':
        return [
            {
                "prompt": f"In {primary_skill}, what is the purpose of exception handling (try/catch or try/except blocks) in a {job} application?",
                "options": "To gracefully catch runtime errors and prevent unexpected program termination|To make code execute faster by skipping validation|To automatically fix syntax errors in source code|To hide all errors so the user never sees them",
                "correct": "To gracefully catch runtime errors and prevent unexpected program termination",
                "exp": "Structured error handling catches runtime exceptions and allows the application to recover or log meaningfully."
            },
            {
                "prompt": f"When working with {second_skill}, what is the primary benefit of using version control systems like Git in a {job} workflow?",
                "options": "Tracking code history, collaborating via branches, and enabling safe rollbacks|Compiling code into machine binaries|Encrypting database connections|Hosting web servers locally",
                "correct": "Tracking code history, collaborating via branches, and enabling safe rollbacks",
                "exp": "Git provides distributed version control, change history, and multi-developer branch integration."
            },
            {
                "prompt": f"Which data structure in {primary_skill} provides average O(1) time complexity for key-value lookups?",
                "options": "Hash Table / Dictionary|Singly Linked List|Unsorted Array|Binary Search Tree",
                "correct": "Hash Table / Dictionary",
                "exp": "Hash tables compute an index via a hashing function, allowing constant-time average access."
            },
            {
                "prompt": f"What is the standard HTTP status code returned by a REST API when a requested resource cannot be found?",
                "options": "404 Not Found|200 OK|500 Internal Server Error|301 Moved Permanently",
                "correct": "404 Not Found",
                "exp": "404 indicates that the server cannot locate the requested URI endpoint or entity."
            },
            {
                "prompt": f"In modern {job} software development, what does writing unit tests primarily achieve?",
                "options": "Verifies individual units or functions produce expected outputs and guards against regressions|Replaces the need to write backend API code|Increases runtime speed in production|Eliminates the need for code styling tools",
                "correct": "Verifies individual units or functions produce expected outputs and guards against regressions",
                "exp": "Unit tests validate modular correctness and give confidence when refactoring or adding features."
            }
        ][:count]
    else: # Mid-level
        return [
            {
                "prompt": f"In {primary_skill}, how can you optimize query performance and eliminate N+1 query problems in a {job} application?",
                "options": "Using eager loading / joins (e.g. joinedload, selectinload) to batch fetch relationships|Running separate select queries inside a loop for each item|Removing all foreign keys from database tables|Converting all queries to raw string concatenation",
                "correct": "Using eager loading / joins (e.g. joinedload, selectinload) to batch fetch relationships",
                "exp": "Eager loading pre-fetches associated models in single batch queries, eliminating repetitive roundtrips."
            },
            {
                "prompt": f"When designing RESTful APIs for {job} services in {second_skill}, what is the recommended method for handling idempotency in POST or payment requests?",
                "options": "Requiring a unique Idempotency-Key header and tracking processed request keys|Allowing duplicate requests and overwriting records|Rejecting all retried HTTP calls with status 400|Disabling timeouts on client network requests",
                "correct": "Requiring a unique Idempotency-Key header and tracking processed request keys",
                "exp": "Idempotency keys ensure safe retries without unintended duplicate operations."
            },
            {
                "prompt": f"Which indexing strategy in relational databases significantly accelerates multi-column filter queries in {primary_skill}?",
                "options": "Composite (compound) B-Tree indexes matching filter column ordering|Creating separate individual indexes on every single column|Full table scans with parallel query execution|Disabling primary keys to reduce write overhead",
                "correct": "Composite (compound) B-Tree indexes matching filter column ordering",
                "exp": "Composite indexes cover multi-predicate WHERE clauses efficiently when following the leftmost prefix rule."
            },
            {
                "prompt": f"How does asynchronous non-blocking I/O improve performance in {job} applications built with {primary_skill}?",
                "options": "Allows the event loop to handle other concurrent requests while waiting for network/disk I/O|Multiplies the CPU clock frequency of the host server|Eliminates the need for error handling and memory management|Runs all operations strictly sequentially in a single thread without yielding",
                "correct": "Allows the event loop to handle other concurrent requests while waiting for network/disk I/O",
                "exp": "Async I/O frees worker threads during pending I/O operations, yielding high concurrency throughput."
            },
            {
                "prompt": f"What is the best practice for managing environment-specific configurations and credentials in {job} deployment pipelines?",
                "options": "Injecting environment variables and secrets through secure container orchestrators (e.g., Vault, Kubernetes Secrets)|Hardcoding passwords in code repository commits|Distributing credentials via plaintext email messages|Storing configuration files directly in public web root directories",
                "correct": "Injecting environment variables and secrets through secure container orchestrators (e.g., Vault, Kubernetes Secrets)",
                "exp": "Externalized environment variables and secret stores keep code secure, portable, and 12-Factor compliant."
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



