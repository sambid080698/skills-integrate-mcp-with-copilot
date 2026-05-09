"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
import json
import os
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=current_dir / "static"), name="static")
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "change-me-please"),
)

admin_users_path = current_dir / "admin_users.json"
try:
    admin_users = json.loads(admin_users_path.read_text())
except FileNotFoundError:
    admin_users = {"teacher": "password123"}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


def require_admin(request: Request):
    if not request.session.get("admin_logged_in"):
        raise HTTPException(status_code=401, detail="Authentication required")
    return True


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/auth/status")
def auth_status(request: Request):
    return {"authenticated": bool(request.session.get("admin_logged_in"))}


@app.post("/login")
async def login(request: Request):
    credentials = await request.json()
    username = credentials.get("username")
    password = credentials.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if admin_users.get(username) != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    request.session["admin_logged_in"] = True
    request.session["admin_username"] = username
    return {"message": "Logged in"}


@app.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, authorized: bool = Depends(require_admin)):
    """Sign up a student for an activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, authorized: bool = Depends(require_admin)):
    """Unregister a student from an activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
