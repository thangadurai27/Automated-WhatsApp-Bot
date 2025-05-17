from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
import mongodb_backend as db
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

# Load environment variables
load_dotenv()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Initialize FastAPI app
app = FastAPI(title="WhatsApp News Bot API with MongoDB")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    subscription_tier: str = "free"
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class WhatsAppNumberBase(BaseModel):
    phone_number: str

class WhatsAppNumberCreate(WhatsAppNumberBase):
    pass

class WhatsAppVerification(BaseModel):
    code: str

class WhatsAppNumber(WhatsAppNumberBase):
    id: str
    user_id: str
    verified: bool = False
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TopicBase(BaseModel):
    name: str
    keywords: str
    country_code: str = "us"
    language: str = "en"

class TopicCreate(TopicBase):
    pass

class Topic(TopicBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ScheduleBase(BaseModel):
    topic_id: str
    frequency: str  # hourly or daily
    time_of_day: Optional[str] = None  # For daily schedules, format: "HH:MM"
    active: bool = True

class ScheduleCreate(ScheduleBase):
    pass

class Schedule(ScheduleBase):
    id: str
    last_run_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user

# Startup and shutdown events
@app.on_event("startup")
async def startup_db_client():
    await db.connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.close_mongo_connection()

# Auth endpoints
@app.post("/register", response_model=User)
async def register_user(user: UserCreate):
    db_user = await db.get_user_by_email(user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    user_data = {
        "email": user.email,
        "password_hash": hashed_password,
        "subscription_tier": "free",
        "created_at": datetime.now()
    }
    return await db.create_user(user_data)

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

# User endpoints
@app.get("/users/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

class SubscriptionUpdate(BaseModel):
    subscription_tier: str

@app.put("/users/subscription")
async def update_subscription(
    subscription_data: SubscriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Update user subscription tier
    await db.update_user_subscription(current_user["id"], subscription_data.subscription_tier)

    # Get updated user
    updated_user = await db.get_user(current_user["id"])
    return {"status": "success", "user": updated_user}

# WhatsApp number endpoints
@app.get("/whatsapp-numbers", response_model=List[WhatsAppNumber])
async def get_whatsapp_numbers(current_user: dict = Depends(get_current_user)):
    numbers = await db.get_user_whatsapp_numbers(current_user["id"])
    return numbers

@app.post("/whatsapp-numbers", response_model=WhatsAppNumber)
async def create_whatsapp_number(
    number: WhatsAppNumberCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user has reached limit based on subscription
    if current_user["subscription_tier"] == "free":
        count = await db.count_user_whatsapp_numbers(current_user["id"])
        if count >= 1:
            raise HTTPException(status_code=400, detail="Free tier limited to 1 WhatsApp number")

    # Generate verification code
    import random
    verification_code = str(random.randint(100000, 999999))

    number_data = {
        "user_id": current_user["id"],
        "phone_number": number.phone_number,
        "verified": False,
        "verification_code": verification_code,
        "created_at": datetime.now()
    }

    return await db.create_whatsapp_number(number_data)

@app.post("/whatsapp-numbers/verify/{number_id}")
async def verify_whatsapp_number(
    number_id: str,
    verification: WhatsAppVerification,
    current_user: dict = Depends(get_current_user)
):
    number = await db.get_whatsapp_number(number_id)
    if not number or number["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")

    verified = await db.verify_whatsapp_number(number_id, verification.code)
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    return {"status": "verified"}

# Topic endpoints
@app.post("/topics", response_model=Topic)
async def create_topic(
    topic: TopicCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user has reached topic limit based on subscription
    if current_user["subscription_tier"] == "free":
        count = await db.count_user_topics(current_user["id"])
        if count >= 3:
            raise HTTPException(status_code=400, detail="Free tier limited to 3 topics")

    topic_data = {
        "user_id": current_user["id"],
        "name": topic.name,
        "keywords": topic.keywords,
        "country_code": topic.country_code,
        "language": topic.language,
        "created_at": datetime.now()
    }

    return await db.create_topic(topic_data)

@app.get("/topics", response_model=List[Topic])
async def read_topics(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    topics = await db.get_user_topics(current_user["id"], skip, limit)
    return topics

# Schedule endpoints
@app.post("/schedules", response_model=Schedule)
async def create_schedule(
    schedule: ScheduleCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify topic belongs to user
    topic = await db.get_topic(schedule.topic_id)
    if not topic or topic["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Check schedule limits for free tier
    if current_user["subscription_tier"] == "free":
        count = await db.count_user_schedules(current_user["id"])
        if count >= 3:
            raise HTTPException(status_code=400, detail="Free tier limited to 3 updates per day")

        # Free tier can only do daily updates
        if schedule.frequency == "hourly":
            raise HTTPException(status_code=400, detail="Free tier limited to daily updates")

    schedule_data = {
        "topic_id": schedule.topic_id,
        "frequency": schedule.frequency,
        "time_of_day": schedule.time_of_day,
        "active": schedule.active,
        "created_at": datetime.now()
    }

    return await db.create_schedule(schedule_data)

# Manual trigger endpoint (for testing)
@app.post("/trigger-update/{schedule_id}")
async def trigger_update(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    schedule = await db.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Verify schedule belongs to user (via topic)
    topic = await db.get_topic(schedule.topic_id)
    if not topic or topic["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Trigger the update (in a real app, this would call a Celery task)
    return {"status": "scheduled", "schedule_id": schedule_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mongo_app:app", host="0.0.0.0", port=8000, reload=True)
