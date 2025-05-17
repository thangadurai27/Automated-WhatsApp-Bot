from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# MongoDB connection string
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://xxxxxxxxxx:xxxxx")
DATABASE_NAME = os.getenv("DATABASE_NAME", "whatsapp_news")

# Async client for FastAPI
async_client = None
async_db = None

# Sync client for Celery
sync_client = None
sync_db = None

# Initialize async MongoDB connection
async def connect_to_mongo():
    global async_client, async_db
    async_client = AsyncIOMotorClient(MONGODB_URL)
    async_db = async_client[DATABASE_NAME]
    print("Connected to MongoDB database")

# Close async MongoDB connection
async def close_mongo_connection():
    global async_client
    if async_client:
        async_client.close()
        print("Closed MongoDB connection")

# Get sync MongoDB connection for Celery
def get_sync_db():
    global sync_client, sync_db
    if sync_client is None:
        sync_client = MongoClient(MONGODB_URL)
        sync_db = sync_client[DATABASE_NAME]
    return sync_db

# Helper function to convert MongoDB ObjectId to string
def serialize_object_id(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, ObjectId):
                obj[k] = str(v)
            elif isinstance(v, dict) or isinstance(v, list):
                obj[k] = serialize_object_id(v)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, ObjectId):
                obj[i] = str(v)
            elif isinstance(v, dict) or isinstance(v, list):
                obj[i] = serialize_object_id(v)
    return obj

# User operations
async def get_user(user_id):
    user = await async_db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        user["id"] = str(user.pop("_id"))
    return user

async def get_user_by_email(email):
    user = await async_db.users.find_one({"email": email})
    if user:
        user["id"] = str(user.pop("_id"))
    return user

async def create_user(user_data):
    result = await async_db.users.insert_one(user_data)
    user = await get_user(result.inserted_id)
    return user

async def update_user_subscription(user_id, subscription_tier):
    await async_db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"subscription_tier": subscription_tier, "updated_at": datetime.now()}}
    )
    return True

# WhatsApp number operations
async def get_whatsapp_number(number_id):
    number = await async_db.whatsapp_numbers.find_one({"_id": ObjectId(number_id)})
    if number:
        number["id"] = str(number.pop("_id"))
    return number

async def count_user_whatsapp_numbers(user_id):
    count = await async_db.whatsapp_numbers.count_documents({"user_id": user_id})
    return count

async def get_user_whatsapp_numbers(user_id):
    cursor = async_db.whatsapp_numbers.find({"user_id": user_id})
    numbers = []
    async for number in cursor:
        number["id"] = str(number.pop("_id"))
        numbers.append(number)
    return numbers

async def create_whatsapp_number(number_data):
    result = await async_db.whatsapp_numbers.insert_one(number_data)
    number = await get_whatsapp_number(result.inserted_id)
    return number

async def verify_whatsapp_number(number_id, code):
    number = await get_whatsapp_number(number_id)
    if not number or number["verification_code"] != code:
        return False

    await async_db.whatsapp_numbers.update_one(
        {"_id": ObjectId(number_id)},
        {"$set": {"verified": True, "verified_at": datetime.now()}}
    )
    return True

# Topic operations
async def get_topic(topic_id):
    topic = await async_db.topics.find_one({"_id": ObjectId(topic_id)})
    if topic:
        topic["id"] = str(topic.pop("_id"))
    return topic

async def get_user_topics(user_id, skip=0, limit=100):
    cursor = async_db.topics.find({"user_id": user_id}).skip(skip).limit(limit)
    topics = []
    async for topic in cursor:
        topic["id"] = str(topic.pop("_id"))
        topics.append(topic)
    return topics

async def count_user_topics(user_id):
    count = await async_db.topics.count_documents({"user_id": user_id})
    return count

async def create_topic(topic_data):
    result = await async_db.topics.insert_one(topic_data)
    topic = await get_topic(result.inserted_id)
    return topic

# Schedule operations
async def get_schedule(schedule_id):
    schedule = await async_db.schedules.find_one({"_id": ObjectId(schedule_id)})
    if schedule:
        schedule["id"] = str(schedule.pop("_id"))
    return schedule

async def count_user_schedules(user_id):
    pipeline = [
        {"$lookup": {"from": "topics", "localField": "topic_id", "foreignField": "_id", "as": "topic"}},
        {"$unwind": "$topic"},
        {"$match": {"topic.user_id": user_id}},
        {"$count": "count"}
    ]
    result = await async_db.schedules.aggregate(pipeline).to_list(1)
    return result[0]["count"] if result else 0

async def create_schedule(schedule_data):
    result = await async_db.schedules.insert_one(schedule_data)
    schedule = await get_schedule(result.inserted_id)
    return schedule

async def get_active_schedules(frequency=None):
    query = {"active": True}
    if frequency:
        query["frequency"] = frequency
    cursor = async_db.schedules.find(query)
    schedules = []
    async for schedule in cursor:
        schedule["id"] = str(schedule.pop("_id"))
        schedules.append(schedule)
    return schedules

# News delivery operations
async def create_news_delivery(delivery_data):
    result = await async_db.news_deliveries.insert_one(delivery_data)
    delivery = await async_db.news_deliveries.find_one({"_id": result.inserted_id})
    if delivery:
        delivery["id"] = str(delivery.pop("_id"))
    return delivery
