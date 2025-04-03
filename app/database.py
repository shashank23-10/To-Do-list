from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
database = client["fastapi_crud"]

todo_collection = database["todos"]
user_collection = database["users"]
ai_collection = database["ai"]
conversation_collection = database["conversations"]
doc_conversation_collection = database["doc_conversations"]