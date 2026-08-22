import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://cbtshire-ai.onrender.com/api"

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    body = json.dumps(data).encode("utf-8") if data else None
    if body:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return resp.status, resp.read().decode("utf-8"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8"), dict(e.headers)
    except Exception as e:
        return 0, str(e), {}

print("1. Testing Register:")
s, b, h = make_req(f"{BASE}/auth/register", "POST", {
    "name": "Sudharsan Admin",
    "email": "sudharsankuttal03@gmail.com",
    "password": "password123",
    "organization": "Cbtshire.ai"
})
print("Register:", s, b)

print("\n2. Testing Login sudharsankuttal03@gmail.com:")
s, b, h = make_req(f"{BASE}/auth/login", "POST", {
    "email": "sudharsankuttal03@gmail.com",
    "password": "password123"
})
print("Login sudhar:", s, b)

print("\n3. Testing Login maya@cbtshire.ai:")
s, b, h = make_req(f"{BASE}/auth/login", "POST", {
    "email": "maya@cbtshire.ai",
    "password": "password123"
})
print("Login maya:", s, b)

print("\n4. Testing CORS Options Preflight:")
s, b, h = make_req(f"{BASE}/auth/login", "OPTIONS", headers={
    "Origin": "https://cbtshire-ai-sudharsanrajendrans-projects.vercel.app",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type"
})
print("CORS status:", s, "Allow-Origin:", h.get("access-control-allow-origin"))
