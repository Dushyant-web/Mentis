import requests
import time
import random

BASE_URL = "http://127.0.0.1:8000"

# -------------------------
# 1. SIGNUP
# -------------------------
def signup():
    url = f"{BASE_URL}/auth/signup"
    data = {
        "email": f"testuser_{int(time.time())}@gmail.com",
        "password": "123456",
        "name": "Dushyant"
    }
    res = requests.post(url, json=data)
    print("Signup:", res.json())


# -------------------------
# 2. LOGIN
# -------------------------
def login():
    url = f"{BASE_URL}/auth/login"

    # always use dynamic email
    email = f"testuser_main@gmail.com"
    password = "123456"

    data = {
        "email": email,
        "password": password
    }

    res = requests.post(url, json=data)

    # if login fails → create user with SAME credentials
    if res.status_code != 200:
        print("Login failed, creating new user...")

        signup_url = f"{BASE_URL}/auth/signup"
        signup_data = {
            "email": email,
            "password": password,
            "name": "Dushyant"
        }

        requests.post(signup_url, json=signup_data)
        time.sleep(1)

        # retry login
        res = requests.post(url, json=data)

    print("Login:", res.json())

    if "access_token" not in res.json():
        raise Exception("Login failed completely")

    return res.json()["access_token"]


# -------------------------
# 3. START ASSESSMENT
# -------------------------
def start_assessment(token):
    url = f"{BASE_URL}/assessment/start"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    try:
        data = res.json()
        print("Start:", data)
        return data["session_id"]
    except Exception:
        print("Start Error:", res.status_code, res.text)
        return None


# -------------------------
# 4. SUBMIT ASSESSMENT
# -------------------------
def submit_assessment(token, session_id):
    url = f"{BASE_URL}/assessment/submit"
    headers = {"Authorization": f"Bearer {token}"}

    # simulate variability for trend testing
    base_eye = random.randint(150, 300)
    base_pen = random.randint(100, 200)

    data = {
        "session_id": session_id,
        "eye_data": [base_eye + random.randint(-50, 50) for _ in range(7)],
        "pen_data": [base_pen + random.randint(-40, 40) for _ in range(7)]
    }

    res = requests.post(url, json=data, headers=headers)
    if res.status_code != 200:
        print("Submit Error:", res.status_code, res.text)
        return False

    try:
        print("Submit:", res.json())
        return True
    except Exception:
        print("Submit Parse Error:", res.status_code, res.text)
        return False


# -------------------------
# 5. GET HISTORY
# -------------------------
def get_history(token):
    url = f"{BASE_URL}/assessment/history"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print("History Error:", res.status_code, res.text)
        return
    try:
        print("History:", res.json())
    except Exception:
        print("History Parse Error:", res.status_code, res.text)


# -------------------------
# 6. GET ANALYTICS
# -------------------------
def get_analytics(token):
    url = f"{BASE_URL}/assessment/analytics"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print("Analytics Error:", res.status_code, res.text)
        return
    try:
        print("Analytics:", res.json())
    except Exception:
        print("Analytics Parse Error:", res.status_code, res.text)


# -------------------------
# 7. GET TRAINING PLAN
# -------------------------
def get_training(token):
    url = f"{BASE_URL}/training/plan"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print("Training Error:", res.status_code, res.text)
        return None
    try:
        data = res.json()
        print("Training Plan:", data)
        print("Today's Exercises:", data.get("program", {}).get("today", {}))
        return data
    except Exception:
        print("Training Parse Error:", res.status_code, res.text)
        return None


# -------------------------
# 9. DASHBOARD SUMMARY
# -------------------------
def get_dashboard_summary(token):
    url = f"{BASE_URL}/dashboard/summary"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    print("Dashboard Summary:", res.json())


# -------------------------
# 10. DASHBOARD HISTORY
# -------------------------
def get_dashboard_history(token):
    url = f"{BASE_URL}/dashboard/history"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    print("Dashboard History:", res.json())


# -------------------------
# 11. PROGRESS GRAPH
# -------------------------
def get_progress_graph(token):
    url = f"{BASE_URL}/dashboard/progress-graph"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print("Progress Graph Error:", res.status_code, res.text)
        return
    try:
        print("Progress Graph:", res.json())
    except Exception:
        print("Progress Graph Parse Error:", res.status_code, res.text)


# -------------------------
# 8. COMPLETE TASK (TEST FIRST TASK)
# -------------------------
def complete_task(token, task_id=1):
    url = f"{BASE_URL}/training/complete/{task_id}"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(url, headers=headers)
    if res.status_code != 200:
        print("Complete Task Error:", res.status_code, res.text)
        return
    try:
        print("Complete Task:", res.json())
    except Exception:
        print("Complete Task Parse Error:", res.status_code, res.text)


# -------------------------
# RUN EVERYTHING
# -------------------------
if __name__ == "__main__":
    token = login()
    # run multiple assessments for trend testing
    for _ in range(3):
        session_id = start_assessment(token)
        if not session_id:
            continue
        time.sleep(1)
        success = submit_assessment(token, session_id)
        if not success:
            print("Skipping due to submit failure")
            continue
    get_history(token)
    get_analytics(token)
    training_data = get_training(token)

    if training_data and "program" in training_data:
        exercises = training_data["program"]["today"]["exercises"]

        # complete first 3 unlocked tasks
        completed = 0
        for task in exercises:
            if not task.get("locked", False):
                complete_task(token, task["id"])
                completed += 1
                if completed >= 3:
                    break
        get_dashboard_summary(token)
        get_dashboard_history(token)
        get_progress_graph(token)
    else:
        print("No tasks found to complete")