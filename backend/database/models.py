from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Plant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str
    species: str
    age: int  # Age in days
    location: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlantImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plant_id: int = Field(foreign_key="plant.id")
    image_data: str = Field(description="Base64 encoded plant photo bytes")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DiseaseHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plant_id: int = Field(foreign_key="plant.id")
    condition: str
    confidence: float
    date_detected: datetime = Field(default_factory=datetime.utcnow)

class HealthScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plant_id: int = Field(foreign_key="plant.id")
    score: int  # 0 to 100
    reasoning: str
    calculated_at: datetime = Field(default_factory=datetime.utcnow)

class Reminder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plant_id: int = Field(foreign_key="plant.id")
    type: str  # watering, fertilizer, pruning, repotting, spraying
    interval_days: int
    next_due: datetime
    last_completed: Optional[datetime] = Field(default=None)

class Treatment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    disease_history_id: int = Field(foreign_key="diseasehistory.id")
    organic_treatment: str
    chemical_treatment: str
    dosage: str
    safety_precautions: str
    recovery_time: str

# Roadmap Placeholder Tables (Schema-ready but empty on Day 1)
class WeatherLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    location: str
    temperature: float
    humidity: float
    condition: str
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class ExpertConsultation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plant_id: int = Field(foreign_key="plant.id")
    expert_name: str
    notes: str
    status: str
    consulted_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    location: str
    disease_type: str
    reported_at: datetime = Field(default_factory=datetime.utcnow)
