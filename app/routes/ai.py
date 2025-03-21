import os
from typing import List, Dict
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv
from app.database import conversation_collection, todo_collection
from app.auth.auth_bearer import JWTBearer
from app.auth.auth_handler import decode_access_token

load_dotenv("app/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("API key for Groq is missing in the .env file.")

from groq import Client
client = Client(api_key=GROQ_API_KEY)

router = APIRouter()

class UserInput(BaseModel):
    message: str
    role: str = "user"
    conversation_id: str

async def get_or_create_conversation(conversation_id: str) -> List[Dict[str, str]]:
    conversation_doc = await conversation_collection.find_one({"_id": conversation_id})
    if conversation_doc:
        return conversation_doc.get("messages", [])
    else:
        new_conversation = [{"role": "system", "content": "Welcome to new chat. How may I help you?"}]
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
        print("Received response from Groq API:", response)
        return response
    except Exception as e:
        print(f"Error with Groq API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error with Groq API: {str(e)}")

def format_tasks(tasks: List[Dict]) -> str:
    if not tasks:
        return "You have no tasks at the moment."
    task_lines = []
    for task in tasks:
        title = task.get("title", "Untitled Task")
        due_date = task.get("dueDate")
        priority = task.get("priority", "N/A")
        if due_date:
            task_lines.append(f"- {title} (Due: {due_date}, Priority: {priority})")
        else:
            task_lines.append(f"- {title} (Priority: {priority})")
    return "Here are your current tasks:\n" + "\n".join(task_lines)

@router.get("/chats", dependencies=[Depends(JWTBearer())])
async def get_chat_history(conversation_id: str = Query(..., description="The ID of the conversation")):
    messages = await get_or_create_conversation(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}

@router.post("/", dependencies=[Depends(JWTBearer())])
async def chat(input: UserInput, token: str = Depends(JWTBearer())):
    # Decode the JWT token to get the username.
    user_data = decode_access_token(token)
    username = user_data.get("sub")
    
    # Retrieve the conversation history.
    messages = await get_or_create_conversation(input.conversation_id)
    
    # Append the user's new message.
    messages.append({"role": input.role, "content": input.message})
    
    
    if any(keyword in input.message.lower() for keyword in ["task", "tasks", "todo", "todos", "work", "assignment", "job", "duty", 
                                                            "project", "responsibility", "deliverable"]):
        query = {"username": username}
        lower_message = input.message.lower()
        if "low priority" in lower_message:
            query["priority"] = "low"
        elif "high priority" in lower_message:
            query["priority"] = "high"
        elif "medium priority" in lower_message:
            query["priority"] = "medium"
        
        tasks_cursor = todo_collection.find(query)
        tasks = await tasks_cursor.to_list(length=None)
        tasks_info = format_tasks(tasks)
        # Append a system message with the tasks information.
        messages.append({"role": "system", "content": tasks_info})
    
    # Query the Groq API with the updated conversation context.
    response = query_groq_api(messages)
    
    # Append the assistant's response to the conversation.
    messages.append({"role": "assistant", "content": response})
    await update_conversation_in_db(input.conversation_id, messages)
    
    return {"response": response, "conversation_id": input.conversation_id}
