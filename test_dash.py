import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://cbtshire-ai.onrender.com/api"

# Login
req = urllib.request.Request(f"{BASE}/auth/login", data=json.dumps({
    "email": "sudharsankuttal03@gmail.com",
    "password": "password123"
}).encode("utf-8"), headers={"Content-Type": "application/json"})

res = urllib.request.urlopen(req, context=ctx)
data = json.loads(res.read().decode("utf-8"))
token = data["access_token"]
print("Auth Token obtained:", token[:20] + "...")

# Get Dashboard
req2 = urllib.request.Request(f"{BASE}/dashboard", headers={"Authorization": f"Bearer {token}"})
res2 = urllib.request.urlopen(req2, context=ctx)
print("Dashboard Data:", res2.status, json.loads(res2.read().decode("utf-8"))["stats"])

# Get Jobs
req3 = urllib.request.Request(f"{BASE}/jobs", headers={"Authorization": f"Bearer {token}"})
res3 = urllib.request.urlopen(req3, context=ctx)
print("Jobs count:", len(json.loads(res3.read().decode("utf-8"))))
