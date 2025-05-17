from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class User(UserBase):
    id: int
    subscription_tier: str
    created_at: datetime

    class Config:
        orm_mode = True

# WhatsApp number schemas
class WhatsAppNumberBase(BaseModel):
    phone_number: str

class WhatsAppNumberCreate(WhatsAppNumberBase):
    pass

class WhatsAppVerification(BaseModel):
    code: str

class WhatsAppNumber(WhatsAppNumberBase):
    id: int
    user_id: int
    verified: bool
    verified_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Topic schemas
class TopicBase(BaseModel):
    name: str
    keywords: str
    country_code: Optional[str] = "us"
    language: Optional[str] = "en"

class TopicCreate(TopicBase):
    pass

class Topic(TopicBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Schedule schemas
class ScheduleBase(BaseModel):
    topic_id: int
    frequency: str  # hourly or daily
    time_of_day: Optional[str] = None  # For daily schedules, format: "HH:MM"
    active: bool = True

class ScheduleCreate(ScheduleBase):
    pass

class Schedule(ScheduleBase):
    id: int
    last_run_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# News delivery schemas
class NewsDeliveryBase(BaseModel):
    schedule_id: int
    status: str
    message_sid: Optional[str] = None
    content: Optional[str] = None

class NewsDeliveryCreate(NewsDeliveryBase):
    pass

class NewsDelivery(NewsDeliveryBase):
    id: int
    delivered_at: datetime

    class Config:
        orm_mode = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
