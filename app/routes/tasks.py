from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from app.schemas import TaskCreate, TaskUpdate
from app.auth.auth_bearer import JWTBearer
from app.auth.auth_handler import decode_access_token
from app.database import todo_collection
from bson import ObjectId
from pathlib import Path

router = APIRouter()


# Helper function to serialize a task document
def task_serializer(task) -> dict:
    return {
        "_id": str(task["_id"]),
        "title": task.get("title"),
        "description": task.get("description"),
        "dueDate": task.get("dueDate"),
        "priority": task.get("priority"),
        "status": task.get("status"),
        "completed": task.get("completed"),
        "username": task.get("username"),
        "pinned": task.get("pinned", False),
        "attachments": task.get("attachments", []),
    }

# Get All Tasks for a Logged-In User
@router.get("/", dependencies=[Depends(JWTBearer())])
async def get_tasks(token: str = Depends(JWTBearer())):
    user_data = decode_access_token(token)
    username = user_data.get("sub")
    
    tasks_cursor = todo_collection.find({"username": username})
    tasks = await tasks_cursor.to_list(length=None)
    return {"tasks": [task_serializer(task) for task in tasks]}

# Add a New Task
@router.post("/", dependencies=[Depends(JWTBearer())])
async def create_task(task: TaskCreate, token: str = Depends(JWTBearer())):
    user_data = decode_access_token(token)
    username = user_data.get("sub")
    new_task = task.dict()
    new_task["username"] = username

    result = await todo_collection.insert_one(new_task)
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Task creation failed")
    
    created_task = await todo_collection.find_one({"_id": result.inserted_id})
    return task_serializer(created_task)

# Update a Task
@router.put("/{task_id}", dependencies=[Depends(JWTBearer())])
async def update_task(task_id: str, updated_task: TaskUpdate, token: str = Depends(JWTBearer())):
    user_data = decode_access_token(token)
    username = user_data.get("sub")

    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid Task ID")

    update_fields = {k: v for k, v in updated_task.dict().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = await todo_collection.update_one(
        {"_id": ObjectId(task_id), "username": username},
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or you don't have permission to edit this task")

    updated = await todo_collection.find_one({"_id": ObjectId(task_id)})
    return task_serializer(updated)

# Delete a Task
@router.delete("/{task_id}", dependencies=[Depends(JWTBearer())])
async def delete_task(task_id: str, token: str = Depends(JWTBearer())):
    user_data = decode_access_token(token)
    username = user_data.get("sub")

    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid Task ID")

    result = await todo_collection.delete_one({"_id": ObjectId(task_id), "username": username})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or you don't have permission to delete this task")

    return {"message": "Task deleted successfully"}
