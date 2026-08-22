import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "http://127.0.0.1:8000/api"

print("========================================")
print("[*] TESTING RECRUITER PROFILE & PLATFORM IDS")
print("========================================")

# 1. Login
req = urllib.request.Request(f"{BASE}/auth/login", data=json.dumps({
    "email": "sudharsankuttal03@gmail.com",
    "password": "password123"
}).encode("utf-8"), headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req, context=ctx)
auth_data = json.loads(res.read().decode("utf-8"))
token = auth_data["access_token"]
headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
print("1. Logged in as:", auth_data["user"]["name"])

# 2. Update Profile with Recruiter IDs
profile_payload = {
    "name": "Sudharsan Rajendran (Lead Talent Partner)",
    "linkedin_profile_url": "https://linkedin.com/in/sudharsan-rajendran-cbts",
    "naukri_recruiter_id": "sudharsan.hr@cbtshire.ai",
    "indeed_employer_id": "EMP-CBTS-9988",
    "careers_page_url": "https://careers.cbtshire.ai"
}
req = urllib.request.Request(f"{BASE}/auth/profile", data=json.dumps(profile_payload).encode("utf-8"), method="PUT", headers=headers)
res = urllib.request.urlopen(req, context=ctx)
updated_user = json.loads(res.read().decode("utf-8"))
print("2. Profile Updated Successfully:")
print("   - Name:", updated_user["name"])
print("   - LinkedIn:", updated_user["linkedin_profile_url"])
print("   - Naukri ID:", updated_user["naukri_recruiter_id"])
print("   - Indeed ID:", updated_user["indeed_employer_id"])
print("   - Careers:", updated_user["careers_page_url"])

# 3. Generate LinkedIn Post with User's specific Profile Link
req = urllib.request.Request(f"{BASE}/integrations/linkedin/post-job", data=json.dumps({
    "position_name": "Senior Full Stack AI Developer",
    "experience": "4-6 Years",
    "skills": "React, Python, FastAPI, OpenAI",
    "location": "Chennai"
}).encode("utf-8"), headers=headers)
res = urllib.request.urlopen(req, context=ctx)
li_res = json.loads(res.read().decode("utf-8"))
print("\n3. Generated LinkedIn Job Post (Using Recruiter's Identity):")
print("   - Recruiter Name:", li_res["recruiter_name"])
print("   - Recruiter Profile URL:", li_res["profile_url"])
print("   - Post Snippet:\n", "\n".join(li_res["post_text"].splitlines()[:7]))

# 4. Generate Naukri Post with Recruiter's Naukri ID
req = urllib.request.Request(f"{BASE}/integrations/naukri/post-job", data=json.dumps({
    "position_name": "Senior Full Stack AI Developer",
    "experience": "4-6 Years",
    "skills": "React, Python, FastAPI, OpenAI",
    "location": "Chennai"
}).encode("utf-8"), headers=headers)
res = urllib.request.urlopen(req, context=ctx)
nk_res = json.loads(res.read().decode("utf-8"))
print("\n4. Generated Naukri Job Post (Using Recruiter's Naukri ID):")
print("   - Assigned Recruiter ID:", nk_res["recruiter_id"])

# 5. Generate Indeed Post with Recruiter's Indeed Employer ID
req = urllib.request.Request(f"{BASE}/integrations/indeed/post-job", data=json.dumps({
    "position_name": "Senior Full Stack AI Developer",
    "experience": "4-6 Years",
    "skills": "React, Python, FastAPI, OpenAI",
    "location": "Chennai"
}).encode("utf-8"), headers=headers)
res = urllib.request.urlopen(req, context=ctx)
ind_res = json.loads(res.read().decode("utf-8"))
print("\n5. Generated Indeed Job Post (Using Employer ID):")
print("   - Employer ID:", ind_res["employer_id"])

print("\n========================================")
print("ALL PROFILE & RECRUITER POSTING WORKFLOWS ARE 100% OPERATIONAL!")
print("========================================")
