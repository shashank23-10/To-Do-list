from fastapi import APIRouter, WebSocket, WebSocketDisconnect,  File, UploadFile, Request
from typing import Dict, List, Tuple
from datetime import datetime
from app.crud import create_chat_message, get_chat_history
import shutil
import os

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[Tuple[str, str], List[WebSocket]] = {}

    async def connect(self, conversation_id: Tuple[str, str], websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, conversation_id: Tuple[str, str], websocket: WebSocket):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast(self, conversation_id: Tuple[str, str], message: str):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/chat/{sender}/{receiver}")
async def chat(websocket: WebSocket, sender: str, receiver: str):
    conversation_id = tuple(sorted([sender, receiver]))
    await manager.connect(conversation_id, websocket)

    # Fetch and send previous chat history to the new connection
    history = await get_chat_history(sender, receiver)
    for msg in history:
        # Format message as sender: message
        formatted_msg = f"{msg['sender']}: {msg['message']}"
        await websocket.send_text(formatted_msg)

    try:
        while True:
            data = await websocket.receive_text()
            # Build a chat message 
            chat_data = {
                "sender": sender,
                "receiver": receiver,
                "message": data,
                "timestamp": datetime.utcnow()
            }
            # Storing msg
            await create_chat_message(chat_data)
            # Broadcast the message to all connections 
            await manager.broadcast(conversation_id, f"{sender}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)
        await manager.broadcast(conversation_id, f"{sender} left the chat.")


@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    upload_folder = "uploads"
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # For simplicity, we return the URL as a relative path.
    file_url = f"{request.base_url}uploads/{file.filename}"
    print("Returning file URL:", file_url)
    return {"url": file_url}
