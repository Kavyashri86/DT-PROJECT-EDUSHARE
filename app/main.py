from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, resources, requests, cart

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

app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(requests.router)
app.include_router(cart.router)


@app.get("/")
def root():
    return {"message": "Welcome to EduShare API"}
