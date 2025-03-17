from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Tuple
from datetime import datetime
from app.crud import create_chat_message, get_chat_history

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Conversation key is a tuple of two usernames (sorted alphabetically)
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
    # Use a sorted tuple so order doesn't matter
    conversation_id = tuple(sorted([sender, receiver]))
    await manager.connect(conversation_id, websocket)

    # Fetch and send previous chat history to the new connection
    history = await get_chat_history(sender, receiver)
    for msg in history:
        # Format the message as "sender: message"
        formatted_msg = f"{msg['sender']}: {msg['message']}"
        await websocket.send_text(formatted_msg)

    try:
        while True:
            data = await websocket.receive_text()
            # Build a chat message object to store
            chat_data = {
                "sender": sender,
                "receiver": receiver,
                "message": data,
                "timestamp": datetime.utcnow()
            }
            # Store the message in the database
            await create_chat_message(chat_data)
            # Broadcast the message to all connections for this conversation
            await manager.broadcast(conversation_id, f"{sender}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)
        await manager.broadcast(conversation_id, f"{sender} left the chat.")
