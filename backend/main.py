import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from sqlmodel import Session, text
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv()

from database.db import init_db, get_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    init_db()
    yield

app = FastAPI(
    title="Verdant AI API",
    description="Backend API for Verdant AI plant identification and disease care planning",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
# Since we use Bearer tokens (Authorization headers) instead of cookies, allow_credentials=True is not strictly required.
# To make it easy for Vercel preview/production deployments, we set allow_origins=["*"] and allow_credentials=False.
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Verdant AI API. Use /health to check database connectivity."}

@app.get("/health")
def health_check(db: Session = Depends(get_session)):
    try:
        db.exec(text("SELECT 1")).one()
        return {
            "status": "healthy",
            "database": "connected",
            "message": "All systems operational"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection error: {str(e)}"
        )

# Import and register routers AFTER app and middleware are fully configured
from routes.auth import router as auth_router
from routes.plants import router as plants_router
from routes.reminders import router as reminders_router

app.include_router(auth_router)
app.include_router(plants_router)
app.include_router(reminders_router)
