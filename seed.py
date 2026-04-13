"""
Run this script once to populate the DB with sample data.
Usage: python seed.py  (from the backend/ directory)
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
import app.models  # noqa: F401 — registers all models
from app.models.user import User
from app.models.resource import Resource
from app.utils.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# --- Users ---
users_data = [
    {"name": "Alice Johnson", "email": "alice@college.edu", "student_id": "STU001", "password": "alice123"},
    {"name": "Bob Smith",     "email": "bob@college.edu",   "student_id": "STU002", "password": "bob123"},
]

users = []
for u in users_data:
    existing = db.query(User).filter(User.email == u["email"]).first()
    if not existing:
        user = User(name=u["name"], email=u["email"], student_id=u["student_id"],
                    password_hash=hash_password(u["password"]))
        db.add(user)
        db.flush()
        users.append(user)
    else:
        users.append(existing)

db.commit()

# --- Resources ---
resources_data = [
    {"name": "Data Structures Textbook", "category": "Book",       "subject": "Computer Science",
     "condition": "Good",  "type": "Donate", "description": "Covers arrays, trees, graphs.", "user_idx": 0},
    {"name": "Scientific Calculator",    "category": "Calculator", "subject": "Mathematics",
     "condition": "New",   "type": "Lend",   "description": "Casio FX-991EX.",               "user_idx": 0},
    {"name": "Arduino Starter Kit",      "category": "Device",     "subject": "Electronics",
     "condition": "Used",  "type": "Share",  "description": "Includes board and sensors.",   "user_idx": 1},
    {"name": "Chemistry Lab Kit",        "category": "Lab Kit",    "subject": "Chemistry",
     "condition": "Good",  "type": "Lend",   "description": "Beakers, test tubes, etc.",     "user_idx": 1},
]

for r in resources_data:
    resource = Resource(
        user_id=users[r["user_idx"]].id,
        name=r["name"], category=r["category"], subject=r["subject"],
        condition=r["condition"], type=r["type"], description=r["description"],
    )
    db.add(resource)

db.commit()
db.close()

print("✅ Seed data inserted successfully.")
print("\nTest credentials:")
for u in users_data:
    print(f"  Email: {u['email']}  |  Password: {u['password']}")
