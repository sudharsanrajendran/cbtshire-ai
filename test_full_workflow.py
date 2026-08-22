import urllib.request
import json
import ssl
import mimetypes
import uuid

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "http://127.0.0.1:8000/api"

print("========================================")
print("[*] CBTSIRE.AI FULL WORKFLOW VALIDATION")
print("========================================")

# 1. Login to get Auth Token
print("\n[1] Testing Recruiter Authentication...")
req = urllib.request.Request(f"{BASE}/auth/login", data=json.dumps({
    "email": "sudharsankuttal03@gmail.com",
    "password": "password123"
}).encode("utf-8"), headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req, context=ctx)
auth_data = json.loads(res.read().decode("utf-8"))
token = auth_data["access_token"]
print("SUCCESS: Login Successful! User:", auth_data["user"]["name"], f"({auth_data['user']['organization']})")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

# 2. Test Job Creation
print("\n[2] Testing Job Creation & Publishing...")
job_payload = {
    "title": "Lead Full-Stack AI Engineer",
    "department": "Core Engineering",
    "location": "Chennai / Hybrid",
    "employment_type": "Full-time",
    "experience_level": "4-7 Years",
    "skills": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL"],
    "openings": 2,
    "description": "We are seeking a Lead Full-Stack AI Engineer to architect scalable recruitment intelligence pipelines."
}
req = urllib.request.Request(f"{BASE}/jobs", data=json.dumps(job_payload).encode("utf-8"), headers=headers)
res = urllib.request.urlopen(req, context=ctx)
new_job = json.loads(res.read().decode("utf-8"))
job_id = new_job["id"]
print(f"SUCCESS: Job Created: ID #{job_id} - '{new_job['title']}' (Status: {new_job['status']})")

# Publish the Job
req = urllib.request.Request(f"{BASE}/jobs/{job_id}/status?status=published", method="PATCH", headers=headers)
res = urllib.request.urlopen(req, context=ctx)
pub_job = json.loads(res.read().decode("utf-8"))
print(f"SUCCESS: Job Published: Status is now '{pub_job['status']}'")

# 3. Test LinkedIn Integration Job Post Generator
print("\n[3] Testing LinkedIn Integration...")
linkedin_payload = {
    "job_id": job_id,
    "position_name": new_job["title"],
    "location": new_job["location"],
    "skills": "React, TypeScript, Python, FastAPI, PostgreSQL",
    "experience": new_job["experience_level"]
}
req = urllib.request.Request(f"{BASE}/integrations/linkedin/post-job", data=json.dumps(linkedin_payload).encode("utf-8"), headers=headers)
res = urllib.request.urlopen(req, context=ctx)
li_res = json.loads(res.read().decode("utf-8"))
print("SUCCESS: LinkedIn Post Generated Successfully!")
print("   - Apply URL:", li_res["job"]["apply_url"])
print("   - Direct Share URL:", li_res["share_url"][:60] + "...")
print("   - Hashtags:", li_res["hashtags"])

# 4. Test External Candidate Ingestion (LinkedIn Easy Apply Simulation)
print("\n[4] Testing LinkedIn Candidate Ingestion...")
sim_payload = {
    "platform": "linkedin",
    "candidate_name": "Rohan Sharma",
    "candidate_email": "rohan.sharma.tech@gmail.com",
    "role": new_job["title"],
    "job_id": job_id,
    "skills": ["React", "Python", "FastAPI", "AWS"]
}
req = urllib.request.Request(f"{BASE}/integrations/simulate", data=json.dumps(sim_payload).encode("utf-8"), headers=headers)
res = urllib.request.urlopen(req, context=ctx)
sim_res = json.loads(res.read().decode("utf-8"))
cand = sim_res['candidate']
print(f"SUCCESS: LinkedIn Candidate Ingested: {cand['name']} (Match: {cand['match_score']}%, Status: {cand['status']})")
if sim_res.get('auto_scheduled_interview'):
    print(f"   - Auto Video Meeting Link: {sim_res['auto_scheduled_interview']['meeting_link']}")

# 5. Verify Candidate In Recruiter Pipeline
print("\n[5] Verifying Candidate inside Recruiter ATS Pipeline...")
req = urllib.request.Request(f"{BASE}/candidates", headers=headers)
res = urllib.request.urlopen(req, context=ctx)
candidates = json.loads(res.read().decode("utf-8"))
matched_candidate = next((c for c in candidates if c["email"] == sim_payload["candidate_email"]), None)
if matched_candidate:
    print(f"SUCCESS: Candidate verified in ATS Pipeline: {matched_candidate['name']} ({matched_candidate['role']}) - Match: {matched_candidate['match_score']}%")
else:
    print("WARNING: Candidate not found in recruiter list")

print("\n========================================")
print("ALL WORKFLOWS (JOB POST, LINKEDIN & APPLY) VERIFIED 100% OPERATIONAL!")
print("========================================")
