from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, crud
from database import SessionLocal, engine, Base
from auth import get_current_user, create_access_token
from celery_worker import send_news_updates

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WhatsApp News Bot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth endpoints
@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# WhatsApp number endpoints
@app.post("/whatsapp-numbers", response_model=schemas.WhatsAppNumber)
def create_whatsapp_number(
    number: schemas.WhatsAppNumberCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user has reached limit based on subscription
    if current_user.subscription_tier == "free":
        count = crud.count_user_whatsapp_numbers(db, user_id=current_user.id)
        if count >= 1:
            raise HTTPException(status_code=400, detail="Free tier limited to 1 WhatsApp number")
    
    return crud.create_whatsapp_number(db=db, number=number, user_id=current_user.id)

@app.post("/whatsapp-numbers/verify/{number_id}")
def verify_whatsapp_number(
    number_id: int,
    verification: schemas.WhatsAppVerification,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    number = crud.get_whatsapp_number(db, number_id=number_id)
    if not number or number.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    # Verify the number with Twilio and update verification status
    verified = crud.verify_whatsapp_number(db, number_id=number_id, code=verification.code)
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    return {"status": "verified"}

# Topic endpoints
@app.post("/topics", response_model=schemas.Topic)
def create_topic(
    topic: schemas.TopicCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user has reached topic limit based on subscription
    if current_user.subscription_tier == "free":
        count = crud.count_user_topics(db, user_id=current_user.id)
        if count >= 3:
            raise HTTPException(status_code=400, detail="Free tier limited to 3 topics")
    
    return crud.create_topic(db=db, topic=topic, user_id=current_user.id)

@app.get("/topics", response_model=List[schemas.Topic])
def read_topics(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topics = crud.get_user_topics(db, user_id=current_user.id, skip=skip, limit=limit)
    return topics

# Schedule endpoints
@app.post("/schedules", response_model=schemas.Schedule)
def create_schedule(
    schedule: schemas.ScheduleCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify topic belongs to user
    topic = crud.get_topic(db, topic_id=schedule.topic_id)
    if not topic or topic.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Check schedule limits for free tier
    if current_user.subscription_tier == "free":
        count = crud.count_user_schedules(db, user_id=current_user.id)
        if count >= 3:
            raise HTTPException(status_code=400, detail="Free tier limited to 3 updates per day")
        
        # Free tier can only do daily updates
        if schedule.frequency == "hourly":
            raise HTTPException(status_code=400, detail="Free tier limited to daily updates")
    
    return crud.create_schedule(db=db, schedule=schedule)

# Manual trigger endpoint (for testing)
@app.post("/trigger-update/{schedule_id}")
def trigger_update(
    schedule_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    schedule = crud.get_schedule(db, schedule_id=schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify schedule belongs to user (via topic)
    topic = crud.get_topic(db, topic_id=schedule.topic_id)
    if not topic or topic.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Trigger the Celery task
    task = send_news_updates.delay(schedule_id)
    
    return {"task_id": task.id, "status": "scheduled"}
