from sqlalchemy.orm import Session
from datetime import datetime
import models, schemas
from auth import get_password_hash, verify_password
from twilio.rest import Client
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Twilio configuration
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")

twilio_client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)

# User operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email=email)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

# WhatsApp number operations
def get_whatsapp_number(db: Session, number_id: int):
    return db.query(models.WhatsAppNumber).filter(models.WhatsAppNumber.id == number_id).first()

def count_user_whatsapp_numbers(db: Session, user_id: int):
    return db.query(models.WhatsAppNumber).filter(models.WhatsAppNumber.user_id == user_id).count()

def create_whatsapp_number(db: Session, number: schemas.WhatsAppNumberCreate, user_id: int):
    # Generate verification code
    import random
    verification_code = str(random.randint(100000, 999999))

    # Format phone number for WhatsApp
    formatted_number = f"whatsapp:{number.phone_number}"

    # Create WhatsApp number in database
    db_number = models.WhatsAppNumber(
        user_id=user_id,
        phone_number=number.phone_number,
        verification_code=verification_code
    )
    db.add(db_number)
    db.commit()
    db.refresh(db_number)

    # Send verification message via Twilio
    try:
        message = twilio_client.messages.create(
            from_=TWILIO_FROM_NUMBER,
            body=f"Your WhatsApp News Bot verification code is: {verification_code}",
            to=formatted_number
        )
    except Exception as e:
        print(f"Error sending verification message: {e}")

    return db_number

def verify_whatsapp_number(db: Session, number_id: int, code: str):
    db_number = get_whatsapp_number(db, number_id=number_id)
    if not db_number or db_number.verification_code != code:
        return False

    db_number.verified = True
    db_number.verified_at = datetime.now()
    db.commit()
    db.refresh(db_number)
    return True

# Topic operations
def get_topic(db: Session, topic_id: int):
    return db.query(models.Topic).filter(models.Topic.id == topic_id).first()

def get_user_topics(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Topic).filter(models.Topic.user_id == user_id).offset(skip).limit(limit).all()

def count_user_topics(db: Session, user_id: int):
    return db.query(models.Topic).filter(models.Topic.user_id == user_id).count()

def create_topic(db: Session, topic: schemas.TopicCreate, user_id: int):
    db_topic = models.Topic(**topic.dict(), user_id=user_id)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic

# Schedule operations
def get_schedule(db: Session, schedule_id: int):
    return db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()

def count_user_schedules(db: Session, user_id: int):
    return db.query(models.Schedule).join(models.Topic).filter(models.Topic.user_id == user_id).count()

def create_schedule(db: Session, schedule: schemas.ScheduleCreate):
    db_schedule = models.Schedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def get_active_schedules(db: Session, frequency: str = None):
    query = db.query(models.Schedule).filter(models.Schedule.active == True)
    if frequency:
        query = query.filter(models.Schedule.frequency == frequency)
    return query.all()

# News delivery operations
def create_news_delivery(db: Session, delivery: schemas.NewsDeliveryCreate):
    db_delivery = models.NewsDelivery(**delivery.dict())
    db.add(db_delivery)
    db.commit()
    db.refresh(db_delivery)
    return db_delivery
