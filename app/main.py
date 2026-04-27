import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.routers import auth, resources, requests, cart
from app.routers import uploads, messages

# Import models so SQLAlchemy registers them before create_all
import app.models  # noqa: F401

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduShare API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(requests.router)
app.include_router(cart.router)
app.include_router(uploads.router)
app.include_router(messages.router)


@app.get("/")
def root():
    return {"message": "Welcome to EduShare API"}
