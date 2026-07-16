from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from database.db import get_session
from database.models import Plant, Reminder, HealthScore, User
from routes.auth import get_current_user
from utils.weather import get_weather_for_location
from ai.care.planner import CarePlanner

router = APIRouter(prefix="/plants", tags=["reminders"])

class ReminderResponse(BaseModel):
    id: int
    plant_id: int
    type: str
    interval_days: int
    next_due: datetime
    last_completed: Optional[datetime] = None
    reasoning: str
    plant_name: Optional[str] = None
    plant_species: Optional[str] = None

def get_dynamic_reasoning(plant: Plant, reminder_type: str, interval: int, location: str) -> str:
    """
    Generates a clean reasoning description dynamically for the API response.
    """
    is_outdoor = "outdoor" in location.lower()
    species = plant.species
    
    if reminder_type == "watering":
        loc_str = "outdoors" if is_outdoor else "indoors"
        return f"Watering scheduled every {interval} days. Optimized for {species} kept {loc_str}."
    elif reminder_type == "fertilizer":
        return f"Fertilization scheduled every {interval} days to supply essential nutrients for {species}."
    elif reminder_type == "misting":
        return f"Misting scheduled every {interval} days to maintain high local foliage humidity for tropical leaf health."
    return f"Care task scheduled every {interval} days."

@router.get("/{plant_id}/reminders", response_model=List[ReminderResponse])
def get_plant_reminders(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # 1. Verify plant ownership
    plant = db.exec(select(Plant).where(Plant.id == plant_id, Plant.user_id == current_user.id)).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant profile not found or access denied."
        )

    # 2. Fetch existing reminders
    reminders = db.exec(select(Reminder).where(Reminder.plant_id == plant_id)).all()

    # 3. If no reminders exist, generate them using CarePlanner
    if not reminders:
        print(f"No reminders found for plant {plant_id}. Generating care schedule...")
        weather = get_weather_for_location(plant.location)
        planner = CarePlanner()
        plan = planner.generate_plan(plant, weather)

        for item in plan:
            db_reminder = Reminder(
                plant_id=plant_id,
                type=item["type"],
                interval_days=item["interval_days"],
                next_due=item["next_due"]
            )
            db.add(db_reminder)
        
        db.commit()
        # Re-fetch reminders
        reminders = db.exec(select(Reminder).where(Reminder.plant_id == plant_id)).all()

    # 4. Map to response model with reasoning
    response = []
    for r in reminders:
        reasoning = get_dynamic_reasoning(plant, r.type, r.interval_days, plant.location)
        response.append(
            ReminderResponse(
                id=r.id,
                plant_id=r.plant_id,
                type=r.type,
                interval_days=r.interval_days,
                next_due=r.next_due,
                last_completed=r.last_completed,
                reasoning=reasoning,
                plant_name=plant.name,
                plant_species=plant.species
            )
        )
    return response

@router.post("/{plant_id}/reminders/{reminder_id}/complete", response_model=ReminderResponse)
def complete_reminder(
    plant_id: int,
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # 1. Verify plant ownership
    plant = db.exec(select(Plant).where(Plant.id == plant_id, Plant.user_id == current_user.id)).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant profile not found or access denied."
        )

    # 2. Fetch reminder
    reminder = db.exec(select(Reminder).where(Reminder.id == reminder_id, Reminder.plant_id == plant_id)).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Care reminder not found."
        )

    # 3. Check care-adherence timing before updating next_due
    now = datetime.utcnow()
    is_on_time = now <= (reminder.next_due + timedelta(hours=24)) # Allow 24 hours grace period

    # 4. Update reminder completion times
    reminder.last_completed = now
    reminder.next_due = now + timedelta(days=reminder.interval_days)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    # 5. Calculate Adherence Health Score Change
    latest_health = db.exec(
        select(HealthScore)
        .where(HealthScore.plant_id == plant_id)
        .order_by(HealthScore.calculated_at.desc())
    ).first()
    
    current_score = latest_health.score if latest_health else 100
    
    if is_on_time:
        new_score = min(100, current_score + 5)
        reasoning = f"Care task '{reminder.type}' completed on time. Health score boosted due to positive adherence (+5)."
    else:
        # Overdue but completed, reward a small recovery
        new_score = min(100, current_score + 2)
        reasoning = f"Overdue care task '{reminder.type}' completed. Recovering health (+2)."

    # Create new health score record
    db_health = HealthScore(
        plant_id=plant_id,
        score=new_score,
        reasoning=reasoning
    )
    db.add(db_health)
    db.commit()

    dynamic_reasoning = get_dynamic_reasoning(plant, reminder.type, reminder.interval_days, plant.location)
    return ReminderResponse(
        id=reminder.id,
        plant_id=reminder.plant_id,
        type=reminder.type,
        interval_days=reminder.interval_days,
        next_due=reminder.next_due,
        last_completed=reminder.last_completed,
        reasoning=dynamic_reasoning,
        plant_name=plant.name,
        plant_species=plant.species
    )

@router.get("/reminders/all", response_model=List[ReminderResponse])
def get_all_user_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Fetch all user plants
    plants = db.exec(select(Plant).where(Plant.user_id == current_user.id)).all()
    plant_ids = [p.id for p in plants]

    if not plant_ids:
        return []

    # Fetch all reminders for these plants
    reminders = db.exec(select(Reminder).where(Reminder.plant_id.in_(plant_ids))).all()

    # Map plants to their details for O(1) lookup
    plant_map = {p.id: p for p in plants}

    response = []
    for r in reminders:
        plant = plant_map.get(r.plant_id)
        if plant:
            dynamic_reasoning = get_dynamic_reasoning(plant, r.type, r.interval_days, plant.location)
            response.append(
                ReminderResponse(
                    id=r.id,
                    plant_id=r.plant_id,
                    type=r.type,
                    interval_days=r.interval_days,
                    next_due=r.next_due,
                    last_completed=r.last_completed,
                    reasoning=dynamic_reasoning,
                    plant_name=plant.name,
                    plant_species=plant.species
                )
            )

    # Sort so that overdue/soon-due tasks appear first
    response.sort(key=lambda x: x.next_due)
    return response

@router.get("/weather/current")
def get_current_weather(
    location: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    return get_weather_for_location(location)
