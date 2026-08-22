import urllib.request
import json
import ssl
import uuid

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "http://127.0.0.1:8000/api"

# Candidate Applies to Job #7 with a mock PDF resume
boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}

mock_pdf_content = b"%PDF-1.4 Mock Resume: Experienced React & Python Full Stack Engineer with 5 years experience."

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="name"\r\n\r\n'
    f"Priya Venkatesh\r\n"
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="email"\r\n\r\n'
    f"priya.venkatesh.dev@gmail.com\r\n"
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="phone"\r\n\r\n'
    f"+91 9840123456\r\n"
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="Priya_Resume.pdf"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
).encode("utf-8") + mock_pdf_content + f"\r\n--{boundary}--\r\n".encode("utf-8")

req = urllib.request.Request(f"{BASE}/public/jobs/7/apply", data=body, headers=headers)
res = urllib.request.urlopen(req, context=ctx)
apply_res = json.loads(res.read().decode("utf-8"))
print("Public Direct Apply Result:", apply_res)
