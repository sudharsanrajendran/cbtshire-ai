import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://cbtshire-ai.onrender.com/api"

print("--- Testing Forgot Password Flow ---")

# Step 1: Forgot Password
try:
    req = urllib.request.Request(f"{BASE}/auth/forgot-password", data=json.dumps({
        "email": "sudharsankuttal03@gmail.com"
    }).encode("utf-8"), headers={"Content-Type": "application/json"})
    res = urllib.request.urlopen(req, context=ctx)
    data = json.loads(res.read().decode("utf-8"))
    print("1. Forgot Password Response:", res.status, data)
    otp = data.get("otp")
    
    # Step 2: Verify OTP
    req2 = urllib.request.Request(f"{BASE}/auth/verify-otp", data=json.dumps({
        "email": "sudharsankuttal03@gmail.com",
        "otp": otp
    }).encode("utf-8"), headers={"Content-Type": "application/json"})
    res2 = urllib.request.urlopen(req2, context=ctx)
    data2 = json.loads(res2.read().decode("utf-8"))
    print("2. Verify OTP Response:", res2.status, data2)
    
    # Step 3: Reset Password
    req3 = urllib.request.Request(f"{BASE}/auth/reset-password", data=json.dumps({
        "email": "sudharsankuttal03@gmail.com",
        "otp": otp,
        "new_password": "newpassword123"
    }).encode("utf-8"), headers={"Content-Type": "application/json"})
    res3 = urllib.request.urlopen(req3, context=ctx)
    data3 = json.loads(res3.read().decode("utf-8"))
    print("3. Reset Password Response:", res3.status, data3)
    
    # Step 4: Login with New Password
    req4 = urllib.request.Request(f"{BASE}/auth/login", data=json.dumps({
        "email": "sudharsankuttal03@gmail.com",
        "password": "newpassword123"
    }).encode("utf-8"), headers={"Content-Type": "application/json"})
    res4 = urllib.request.urlopen(req4, context=ctx)
    data4 = json.loads(res4.read().decode("utf-8"))
    print("4. Login with New Password Response:", res4.status, data4["user"]["email"])

except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode("utf-8"))
except Exception as e:
    print("General Error:", e)
