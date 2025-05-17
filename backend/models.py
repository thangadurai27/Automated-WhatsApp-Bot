from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    subscription_tier = Column(String, default="free")  # free or paid
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    whatsapp_numbers = relationship("WhatsAppNumber", back_populates="user")
    topics = relationship("Topic", back_populates="user")

class WhatsAppNumber(Base):
    __tablename__ = "whatsapp_numbers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    phone_number = Column(String, index=True)
    verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="whatsapp_numbers")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    keywords = Column(String)
    country_code = Column(String, default="us")
    language = Column(String, default="en")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="topics")
    schedules = relationship("Schedule", back_populates="topic")

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    frequency = Column(Enum("hourly", "daily", name="frequency_types"))
    time_of_day = Column(String, nullable=True)  # For daily schedules, format: "HH:MM"
    active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)

    topic = relationship("Topic", back_populates="schedules")
    deliveries = relationship("NewsDelivery", back_populates="schedule")

class NewsDelivery(Base):
    __tablename__ = "news_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"))
    delivered_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String)  # success, failed
    message_sid = Column(String, nullable=True)  # Twilio message SID
    content = Column(Text, nullable=True)  # Store the sent content for reference

    schedule = relationship("Schedule", back_populates="deliveries")
