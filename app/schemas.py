from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TaskCreate(BaseModel):
    title: str
    description: str
    dueDate: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "todo"
    completed: Optional[bool] = False
    pinned: Optional[bool] = False

class TaskUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    dueDate: Optional[str]
    priority: Optional[str]
    status: Optional[str]
    completed: Optional[bool]
    pinned: Optional[bool] = None

class ChatMessageCreate(BaseModel):
    sender: str
    receiver: str
    message: str

class ChatMessageResponse(BaseModel):
    id: str
    sender: str
    receiver: str
    message: str
    timestamp: datetime
