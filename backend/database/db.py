import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv()

# Get DATABASE_URL from environment or fallback to local SQLite database
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    # Use SQLite for local development if PostgreSQL database URL is not provided
    DATABASE_URL = "sqlite:///c:/Users/chegu/OneDrive/Desktop/Plants/plants.db"
else:
    # SQLAlchemy requires postgresql:// instead of postgres://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure database engine
# SQLite needs connect_args={"check_same_thread": False} to be used with multithreaded FastAPI
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

def init_db():
    # Automatically create tables if they do not exist
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
