from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database.db import get_session
from database.models import Plant, PlantImage, HealthScore, DiseaseHistory, User
from routes.auth import get_current_user
from ai.classification.classification import SpeciesClassifier
from ai.disease.diagnose import DiseaseScanner

router = APIRouter(prefix="/plants", tags=["plants"])

# Pydantic schemas for request/response validation
class PlantRegisterRequest(BaseModel):
    name: str
    age_months: int
    location: str
    image_data: str  # Base64 encoded leaf image string (required close-up)
    whole_plant_image: Optional[str] = None
    leaf_back_image: Optional[str] = None
    flower_fruit_image: Optional[str] = None

class PlantResponse(BaseModel):
    id: int
    name: str
    species: str
    age: int
    location: str
    created_at: datetime
    health_score: int

class SpeciesIDDetails(BaseModel):
    species: str
    raw_confidence: float
    calibrated_confidence: float
    confidence_gap: float
    was_calibrated: bool
    alternative_guess: str
    reasoning: str

class PlantRegisterResponse(BaseModel):
    plant: PlantResponse
    ai_details: SpeciesIDDetails

class PlantDetailResponse(BaseModel):
    id: int
    name: str
    species: str
    age: int
    location: str
    created_at: datetime
    health_score: int
    image_data: str  # Base64 image data

class DiagnosisResultResponse(BaseModel):
    condition: str
    is_healthy: bool
    confidence: float
    needs_expert: bool
    treatments: List[str]
    health_score: int

class TimelineEvent(BaseModel):
    event_type: str  # "diagnosis" or "health_update"
    date: datetime
    title: str
    subtitle: str
    meta: str

@router.post("/register", response_model=PlantRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_plant(
    payload: PlantRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    classifier = SpeciesClassifier()
    
    # 1. Run AI Species Classification
    try:
        ai_res = classifier.classify(
            leaf_image_base64=payload.image_data,
            whole_plant_image_base64=payload.whole_plant_image,
            leaf_back_image_base64=payload.leaf_back_image,
            flower_fruit_image_base64=payload.flower_fruit_image
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI species identification service error: {str(e)}"
        )
    
    # Convert age in months to days (as expected by DB schema)
    age_days = payload.age_months * 30
    
    # 2. Save Plant profile to database
    db_plant = Plant(
        user_id=current_user.id,
        name=payload.name,
        species=ai_res["species"],
        age=age_days,
        location=payload.location
    )
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    
    # 3. Save Plant photo in PlantImage table
    db_image = PlantImage(
        plant_id=db_plant.id,
        image_data=payload.image_data
    )
    db.add(db_image)
    
    # 4. Initialize first HealthScore record (defaults to 100 on registration)
    initial_score = 100
    db_health = HealthScore(
        plant_id=db_plant.id,
        score=initial_score,
        reasoning=f"Plant registered successfully. Initialized health score for {db_plant.species}."
    )
    db.add(db_health)
    
    db.commit()
    
    # 5. Format response
    plant_resp = PlantResponse(
        id=db_plant.id,
        name=db_plant.name,
        species=db_plant.species,
        age=db_plant.age,
        location=db_plant.location,
        created_at=db_plant.created_at,
        health_score=initial_score
    )
    
    ai_details = SpeciesIDDetails(
        species=ai_res["species"],
        raw_confidence=ai_res["raw_confidence"],
        calibrated_confidence=ai_res["calibrated_confidence"],
        confidence_gap=ai_res["confidence_gap"],
        was_calibrated=ai_res["was_calibrated"],
        alternative_guess=ai_res["alternative_guess"],
        reasoning=ai_res["reasoning"]
    )
    
    return {
        "plant": plant_resp,
        "ai_details": ai_details
    }

def check_and_apply_care_penalties(plant_id: int, db: Session) -> int:
    """
    Checks if care reminders are overdue and updates the plant's health score.
    Returns the current/new health score.
    """
    from database.models import Reminder, HealthScore
    
    # Get the latest explicit score (from AI diagnosis or manual completion events)
    # We ignore care adherence automatic adjustment records to prevent feedback loops.
    latest_explicit = db.exec(
        select(HealthScore)
        .where(
            HealthScore.plant_id == plant_id,
            ~HealthScore.reasoning.like("Health score adjusted based on care%")
        )
        .order_by(HealthScore.calculated_at.desc())
    ).first()
    
    base_score = latest_explicit.score if latest_explicit else 100

    # Get all reminders
    reminders = db.exec(select(Reminder).where(Reminder.plant_id == plant_id)).all()
    if not reminders:
        return base_score

    # Calculate total penalty from overdue reminders
    total_penalty = 0
    now = datetime.utcnow()
    overdue_details = []
    
    for r in reminders:
        if now > r.next_due:
            seconds_overdue = (now - r.next_due).total_seconds()
            days_overdue = int(seconds_overdue / 86400) + 1
            
            if r.type == "watering":
                penalty = days_overdue * 5
            else:
                penalty = days_overdue * 2
                
            total_penalty += penalty
            overdue_details.append(f"{r.type} overdue by {days_overdue} day(s) (-{penalty})")

    new_score = max(10, base_score - total_penalty)

    latest_health = db.exec(
        select(HealthScore)
        .where(HealthScore.plant_id == plant_id)
        .order_by(HealthScore.calculated_at.desc())
    ).first()

    # If score changed (or no score exists), insert a new record
    if not latest_health or latest_health.score != new_score:
        reasoning = "Health score adjusted based on care adherence. "
        if overdue_details:
            reasoning += f"Penalized for: {', '.join(overdue_details)}."
        else:
            reasoning += "All care tasks are up to date."
            
        db_health = HealthScore(
            plant_id=plant_id,
            score=new_score,
            reasoning=reasoning
        )
        db.add(db_health)
        db.commit()
        
    return new_score

@router.get("/", response_model=List[PlantResponse])
def get_user_plants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Fetch all plants belonging to the logged-in user
    plants = db.exec(select(Plant).where(Plant.user_id == current_user.id)).all()
    
    response_list = []
    for plant in plants:
        # Run care adherence updates dynamically on list fetch
        score = check_and_apply_care_penalties(plant.id, db)
        
        response_list.append(
            PlantResponse(
                id=plant.id,
                name=plant.name,
                species=plant.species,
                age=plant.age,
                location=plant.location,
                created_at=plant.created_at,
                health_score=score
            )
        )
        
    return response_list

@router.get("/{plant_id}", response_model=PlantDetailResponse)
def get_plant_details(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # 1. Fetch plant profile
    plant = db.exec(select(Plant).where(Plant.id == plant_id, Plant.user_id == current_user.id)).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant profile not found or access denied."
        )
    
    # 2. Fetch the registered image
    image = db.exec(select(PlantImage).where(PlantImage.plant_id == plant_id).order_by(PlantImage.created_at.desc())).first()
    image_str = image.image_data if image else ""
    
    # 3. Calculate latest health score with dynamic care penalties
    score = check_and_apply_care_penalties(plant_id, db)
    
    return PlantDetailResponse(
        id=plant.id,
        name=plant.name,
        species=plant.species,
        age=plant.age,
        location=plant.location,
        created_at=plant.created_at,
        health_score=score,
        image_data=image_str
    )

@router.post("/{plant_id}/diagnose", response_model=DiagnosisResultResponse)
def diagnose_plant(
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
    
    # 2. Retrieve plant leaf image
    image = db.exec(select(PlantImage).where(PlantImage.plant_id == plant_id).order_by(PlantImage.created_at.desc())).first()
    if not image or not image.image_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No leaf scan image registered for this plant. Please register or upload an image first."
        )
    
    # 3. Perform AI disease diagnosis scan
    scanner = DiseaseScanner()
    try:
        scan_res = scanner.scan(image.image_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI disease diagnostic scanner error: {str(e)}"
        )
    
    # 4. Save results to DiseaseHistory
    db_history = DiseaseHistory(
        plant_id=plant_id,
        condition=scan_res["clean_name"],
        confidence=scan_res["confidence"]
    )
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    
    # 5. Calculate new HealthScore
    # Formula: If healthy -> 100; if diseased, reduce health score proportionally to prediction confidence (with 10 as minimum floor)
    if scan_res["is_healthy"]:
        new_score = 100
        reasoning = f"AI leaf diagnostic scan completed. No active pathogens detected (Confidence: {int(scan_res['confidence']*100)}%)."
    else:
        new_score = max(10, int(100 - (scan_res["confidence"] * 100)))
        reasoning = f"AI leaf diagnostic scan detected: {scan_res['clean_name']} (Confidence: {int(scan_res['confidence']*100)}%)."
        
    db_health = HealthScore(
        plant_id=plant_id,
        score=new_score,
        reasoning=reasoning
    )
    db.add(db_health)
    db.commit()
    
    # Run care penalties check to compute the active health score
    final_score = check_and_apply_care_penalties(plant_id, db)
    
    return {
        "condition": scan_res["clean_name"],
        "is_healthy": scan_res["is_healthy"],
        "confidence": scan_res["confidence"],
        "needs_expert": scan_res["needs_expert"],
        "treatments": scan_res["treatments"],
        "health_score": final_score
    }

@router.get("/{plant_id}/history", response_model=List[TimelineEvent])
def get_plant_timeline(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # 1. Verify ownership
    plant = db.exec(select(Plant).where(Plant.id == plant_id, Plant.user_id == current_user.id)).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plant profile not found or access denied."
        )
    
    # 2. Fetch all diagnoses
    diagnoses = db.exec(select(DiseaseHistory).where(DiseaseHistory.plant_id == plant_id)).all()
    
    # 3. Fetch all health scores
    health_updates = db.exec(select(HealthScore).where(HealthScore.plant_id == plant_id)).all()
    
    # 4. Form unified timeline list
    events = []
    
    for diag in diagnoses:
        conf_percent = int(diag.confidence * 100)
        events.append(
            TimelineEvent(
                event_type="diagnosis",
                date=diag.date_detected,
                title=f"AI Disease Scan: {diag.condition}",
                subtitle=f"Confidence Score: {conf_percent}%",
                meta="expert_review" if diag.confidence < 0.70 else "calibrated"
            )
        )
        
    for hu in health_updates:
        events.append(
            TimelineEvent(
                event_type="health_update",
                date=hu.calculated_at,
                title=f"Health Score Update: {hu.score}/100",
                subtitle=hu.reasoning,
                meta=""
            )
        )
        
    # Sort events by date descending
    events.sort(key=lambda x: x.date, reverse=True)
    
    return events

class ImpactResponse(BaseModel):
    plant_id: int
    carbon_co2_kg: float
    water_saved_liters: float
    c_rate: float
    water_saved_per_day: float
    formula_details: str

class ImpactSummaryResponse(BaseModel):
    total_plants: int
    total_carbon_co2_kg: float
    total_water_saved_liters: float

@router.get("/impact/summary", response_model=ImpactSummaryResponse)
def get_user_impact_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    plants = db.exec(select(Plant).where(Plant.user_id == current_user.id)).all()
    if not plants:
        return ImpactSummaryResponse(total_plants=0, total_carbon_co2_kg=0.0, total_water_saved_liters=0.0)
        
    total_carbon = 0.0
    total_water = 0.0
    
    from database.models import Reminder
    
    for p in plants:
        species_lower = p.species.lower()
        if "succulent" in species_lower or "cactus" in species_lower or "echeveria" in species_lower:
            c_rate = 0.001
        elif "basil" in species_lower or "mint" in species_lower or "herb" in species_lower or "tenuiflorum" in species_lower:
            c_rate = 0.003
        elif "fern" in species_lower or "monstera" in species_lower or "palm" in species_lower or "ivy" in species_lower:
            c_rate = 0.008
        elif "tomato" in species_lower or "pepper" in species_lower or "crop" in species_lower:
            c_rate = 0.015
        else:
            c_rate = 0.005
            
        carbon = p.age * c_rate
        
        # Water savings
        watering_reminder = db.exec(
            select(Reminder)
            .where(Reminder.plant_id == p.id, Reminder.type == "watering")
        ).first()
        
        default_interval = 4
        if "succulent" in species_lower or "cactus" in species_lower:
            default_interval = 12
        elif "fern" in species_lower or "monstera" in species_lower:
            default_interval = 6
        elif "tomato" in species_lower or "pepper" in species_lower:
            default_interval = 4
            
        current_interval = watering_reminder.interval_days if watering_reminder else default_interval
        savings_ratio = max(0.0, (1.0 / default_interval) - (1.0 / current_interval))
        weather_savings = savings_ratio * 0.5 * p.age
        
        water_saved = (0.15 * p.age) + weather_savings
        
        total_carbon += carbon
        total_water += water_saved
        
    return ImpactSummaryResponse(
        total_plants=len(plants),
        total_carbon_co2_kg=round(total_carbon, 3),
        total_water_saved_liters=round(total_water, 1)
    )

@router.get("/{plant_id}/impact", response_model=ImpactResponse)
def get_plant_impact(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    plant = db.exec(select(Plant).where(Plant.id == plant_id, Plant.user_id == current_user.id)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied.")
        
    species_lower = plant.species.lower()
    if "succulent" in species_lower or "cactus" in species_lower or "echeveria" in species_lower:
        c_rate = 0.001
        plant_type = "Succulent"
        default_interval = 12
    elif "basil" in species_lower or "mint" in species_lower or "herb" in species_lower or "tenuiflorum" in species_lower:
        c_rate = 0.003
        plant_type = "Herb/Spice"
        default_interval = 4
    elif "fern" in species_lower or "monstera" in species_lower or "palm" in species_lower or "ivy" in species_lower:
        c_rate = 0.008
        plant_type = "Foliage/Tropical"
        default_interval = 6
    elif "tomato" in species_lower or "pepper" in species_lower or "crop" in species_lower:
        c_rate = 0.015
        plant_type = "Crop/Vegetable"
        default_interval = 4
    else:
        c_rate = 0.005
        plant_type = "Standard Botanical"
        default_interval = 4
        
    carbon = plant.age * c_rate
    
    # Calculate water saved
    from database.models import Reminder
    watering_reminder = db.exec(
        select(Reminder)
        .where(Reminder.plant_id == plant.id, Reminder.type == "watering")
    ).first()
    
    current_interval = watering_reminder.interval_days if watering_reminder else default_interval
    savings_ratio = max(0.0, (1.0 / default_interval) - (1.0 / current_interval))
    weather_savings = savings_ratio * 0.5 * plant.age
    
    water_saved_per_day = 0.15 + (savings_ratio * 0.5)
    water_saved = (0.15 * plant.age) + weather_savings
    
    formula_details = (
        f"Carbon CO2 absorbed = age ({plant.age} days) * species rate ({c_rate} kg/day for {plant_type}). "
        f"Water saved = base efficiency (0.15 L/day) * age + weather-adjusted watering savings ratio ({savings_ratio:.3f} L/day) * age."
    )
    
    return ImpactResponse(
        plant_id=plant.id,
        carbon_co2_kg=round(carbon, 3),
        water_saved_liters=round(water_saved, 2),
        c_rate=c_rate,
        water_saved_per_day=round(water_saved_per_day, 3),
        formula_details=formula_details
    )
