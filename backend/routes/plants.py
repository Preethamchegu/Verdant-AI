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

@router.get("/", response_model=List[PlantResponse])
def get_user_plants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Fetch all plants belonging to the logged-in user
    plants = db.exec(select(Plant).where(Plant.user_id == current_user.id)).all()
    
    response_list = []
    for plant in plants:
        # Fetch the latest health score for each plant
        latest_health = db.exec(
            select(HealthScore)
            .where(HealthScore.plant_id == plant.id)
            .order_by(HealthScore.calculated_at.desc())
        ).first()
        
        score = latest_health.score if latest_health else 100
        
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
    
    # 3. Fetch latest health score
    latest_health = db.exec(
        select(HealthScore)
        .where(HealthScore.plant_id == plant_id)
        .order_by(HealthScore.calculated_at.desc())
    ).first()
    score = latest_health.score if latest_health else 100
    
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
    
    return {
        "condition": scan_res["clean_name"],
        "is_healthy": scan_res["is_healthy"],
        "confidence": scan_res["confidence"],
        "needs_expert": scan_res["needs_expert"],
        "treatments": scan_res["treatments"],
        "health_score": new_score
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
