from celery import Celery
from sqlalchemy.orm import Session
import requests
import google.generativeai as genai
from twilio.rest import Client
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import models, schemas
from database import SessionLocal

# Load environment variables from .env file
load_dotenv()

# Environment variables
NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY")
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Celery
celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-pro")

# Initialize Twilio client
twilio_client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

def summarize_news(text):
    prompt = f"Summarize the following news article in one line:\n\n{text}"
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error during summarization: {e}")
        # Extract a short summary from the text (first 100 characters)
        short_text = text[:100] + "..." if len(text) > 100 else text
        return f"(AI Unavailable) {short_text}"

def get_news_for_topic(topic):
    url = (
        f"https://newsdata.io/api/1/news"
        f"?apikey={NEWSDATA_API_KEY}"
        f"&q={topic.keywords}"
        f"&country={topic.country_code}"
        f"&language={topic.language}"
    )

    try:
        response = requests.get(url)
        data = response.json()

        if data.get("status") == "success" and data.get("results"):
            messages = []
            for article in data["results"][:3]:  # Limit to 3 articles
                title = article["title"]
                source = article.get("source_id", "Unknown")
                pub_date = article["pubDate"]
                link = article["link"]

                # Get article content for summarization
                article_text = article.get("content", article.get("description", title))

                # Summarize the article
                summary = summarize_news(article_text)

                # Add both original title and AI summary to the message
                messages.append(f"🗞️ *{title}*\n📌 Summary: {summary}\n📍 {source} | 🕒 {pub_date}\n🔗 {link}")

            return "\n\n".join(messages)
        return "⚠️ No news found for your topic."
    except Exception as e:
        print(f"Error fetching news: {e}")
        return f"⚠️ Error fetching news: {str(e)}"

def send_whatsapp_message(to_number, message):
    try:
        formatted_number = f"whatsapp:{to_number}"
        message = twilio_client.messages.create(
            from_=TWILIO_FROM_NUMBER,
            body=message,
            to=formatted_number
        )
        return message.sid
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")
        return None

@celery_app.task
def send_news_updates(schedule_id):
    db = get_db()
    try:
        # Get schedule
        schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
        if not schedule or not schedule.active:
            return {"status": "error", "message": "Schedule not found or inactive"}

        # Get topic
        topic = db.query(models.Topic).filter(models.Topic.id == schedule.topic_id).first()
        if not topic:
            return {"status": "error", "message": "Topic not found"}

        # Get user's WhatsApp number
        whatsapp_number = db.query(models.WhatsAppNumber).filter(
            models.WhatsAppNumber.user_id == topic.user_id,
            models.WhatsAppNumber.verified == True
        ).first()

        if not whatsapp_number:
            return {"status": "error", "message": "No verified WhatsApp number found"}

        # Get news for topic
        news_content = get_news_for_topic(topic)

        # Send WhatsApp message
        message_sid = send_whatsapp_message(whatsapp_number.phone_number, news_content)

        # Update last run time
        schedule.last_run_at = datetime.now()
        db.commit()

        # Create delivery record
        delivery = models.NewsDelivery(
            schedule_id=schedule.id,
            status="success" if message_sid else "failed",
            message_sid=message_sid,
            content=news_content
        )
        db.add(delivery)
        db.commit()

        return {
            "status": "success",
            "message_sid": message_sid,
            "schedule_id": schedule.id,
            "topic_id": topic.id
        }
    except Exception as e:
        print(f"Error in send_news_updates task: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@celery_app.task
def schedule_hourly_updates():
    db = get_db()
    try:
        # Get all active hourly schedules
        schedules = db.query(models.Schedule).filter(
            models.Schedule.active == True,
            models.Schedule.frequency == "hourly"
        ).all()

        for schedule in schedules:
            send_news_updates.delay(schedule.id)

        return {"status": "success", "scheduled_count": len(schedules)}
    except Exception as e:
        print(f"Error in schedule_hourly_updates task: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@celery_app.task
def schedule_daily_updates():
    db = get_db()
    try:
        # Get current hour in 24-hour format
        current_hour = datetime.now().strftime("%H:00")

        # Get all active daily schedules for the current hour
        schedules = db.query(models.Schedule).filter(
            models.Schedule.active == True,
            models.Schedule.frequency == "daily",
            models.Schedule.time_of_day.startswith(current_hour.split(":")[0])
        ).all()

        for schedule in schedules:
            send_news_updates.delay(schedule.id)

        return {"status": "success", "scheduled_count": len(schedules)}
    except Exception as e:
        print(f"Error in schedule_daily_updates task: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
