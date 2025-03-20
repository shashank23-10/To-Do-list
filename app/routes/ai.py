import os
from typing import List, Dict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv
from app.database import ai_collection

load_dotenv("app/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("API key for Groq is missing in the .env file.")

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI not set in .env")

mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client["ai_collection"]  
conversation_collection = db["conversations"]

router = APIRouter()


from groq import Client
client = Client(api_key=GROQ_API_KEY)

class UserInput(BaseModel):
    message: str
    role: str = "user"
    conversation_id: str

async def get_or_create_conversation(conversation_id: str) -> List[Dict[str, str]]:
    conversation_doc = await conversation_collection.find_one({"_id": conversation_id})
    if conversation_doc:
        return conversation_doc.get("messages", [])
    else:
        new_conversation = [{"role": "system", "content": "You are a useful AI assistant."}]
        await conversation_collection.insert_one({
            "_id": conversation_id,
            "messages": new_conversation,
            "updated_at": datetime.utcnow()
        })
        return new_conversation

async def update_conversation_in_db(conversation_id: str, messages: List[Dict[str, str]]):
    await conversation_collection.update_one(
        {"_id": conversation_id},
        {"$set": {
            "messages": messages,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )

def query_groq_api(messages: List[Dict[str, str]]) -> str:
    try:
        print("Sending messages to Groq API:", messages)
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=1,
            max_tokens=1024,
            top_p=1,
            stream=True,
            stop=None,
        )
        
        response = ""
        for chunk in completion:
            response += chunk.choices[0].delta.content or ""
        
        # Debug: log received response
        print("Received response from Groq API:", response)
        return response
    
    except Exception as e:
        print(f"Error with Groq API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error with Groq API: {str(e)}")

@router.get("/chats")
async def get_chat_history(conversation_id: str = Query(..., description="The ID of the conversation")):
    conversation_doc = await conversation_collection.find_one({"_id": conversation_id})
    if not conversation_doc:
        raise HTTPException(status_code=404, detail="No chat history found.")
    return {
        "conversation_id": conversation_id,
        "messages": conversation_doc.get("messages", [])
    }

@router.post("/")
async def chat(input: UserInput):
    messages = await get_or_create_conversation(input.conversation_id)
    messages.append({"role": input.role, "content": input.message})
    
    response = query_groq_api(messages)
    
    messages.append({"role": "assistant", "content": response})
    await update_conversation_in_db(input.conversation_id, messages)
    
    return {
        "response": response,
        "conversation_id": input.conversation_id
    }
