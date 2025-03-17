from .database import todo_collection
from .models import task_serializer
from bson import ObjectId
from .database import database
from .models import chat_message_serializer

async def create_todo(todo_data):
    new_todo = await todo_collection.insert_one(todo_data.dict())
    created_todo = await todo_collection.find_one({"_id": new_todo.inserted_id})
    return todo_serializer(created_todo)

async def get_todos():
    todos = await todo_collection.find().to_list(100)
    return [todo_serializer(todo) for todo in todos]

async def update_todo(id, todo_data):
    id = id.strip("{}")
    if not ObjectId.is_valid(id):
        return {"error": "Invalid ID format"}
    update_data = {k: v for k, v in todo_data.dict().items() if v is not None}
    await todo_collection.replace_one({"_id": ObjectId(id)}, update_data)
    updated_todo = await todo_collection.find_one({"_id": ObjectId(id)})
    return todo_serializer(updated_todo)

async def delete_todo(id):
    id = id.strip("{}")
    if not ObjectId.is_valid(id):
        return {"error": "Invalid ID format"}
    await todo_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "Todo deleted successfully"}

chat_collection = database["chat_messages"]

async def create_chat_message(chat_data: dict) -> dict:
    result = await chat_collection.insert_one(chat_data)
    new_message = await chat_collection.find_one({"_id": result.inserted_id})
    return chat_message_serializer(new_message)

async def get_chat_history(user1: str, user2: str) -> list:
    query = {
        "$or": [
            {"sender": user1, "receiver": user2},
            {"sender": user2, "receiver": user1}
        ]
    }
    messages = await chat_collection.find(query).sort("timestamp", 1).to_list(length=1000)
    return [chat_message_serializer(msg) for msg in messages]