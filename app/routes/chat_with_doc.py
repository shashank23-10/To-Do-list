import os
import numpy as np
from typing import List, Dict
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv
from app.database import doc_conversation_collection  # ensure this collection exists in your DB
from app.auth.auth_bearer import JWTBearer
from app.auth.auth_handler import decode_access_token

load_dotenv("app/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("API key for Groq is missing in the .env file.")

from groq import Client
client = Client(api_key=GROQ_API_KEY)

router = APIRouter()

# --- VectorDB Implementation ---
def compute_embedding(text: str) -> List[float]:
    """
    A placeholder function to compute an embedding.
    For demonstration purposes, this returns a fixed-length vector
    based on character ordinals. Replace with your actual embedding model.
    """
    vec = [float(ord(c)) for c in text]
    if len(vec) < 50:
        vec += [0.0] * (50 - len(vec))
    else:
        vec = vec[:50]
    return vec

class VectorDB:
    def __init__(self):
        # Stored documents: each is a dict with doc_id, title, content, and its embedding.
        self.documents = []
    
    def add_document(self, doc_id: str, title: str, content: str):
        embedding = compute_embedding(content)
        doc = {
            "doc_id": doc_id,
            "title": title,
            "content": content,
            "embedding": embedding
        }
        self.documents.append(doc)
    
    def get_document(self, doc_id: str) -> Dict:
        for doc in self.documents:
            if doc["doc_id"] == doc_id:
                return doc
        return None
    
    def search_documents(self, query: str, top_k: int = 1) -> List[Dict]:
        query_embedding = np.array(compute_embedding(query))
        results = []
        for doc in self.documents:
            doc_embedding = np.array(doc["embedding"])
            similarity = np.dot(query_embedding, doc_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(doc_embedding) + 1e-10
            )
            results.append((similarity, doc))
        results.sort(key=lambda x: x[0], reverse=True)
        return [doc for sim, doc in results[:top_k]]

# Instantiate a global in-memory vector database
vector_db = VectorDB()

# --- Pydantic Models ---
class Document(BaseModel):
    doc_id: str
    title: str
    content: str

class DocUserInput(BaseModel):
    message: str
    doc_id: str
    conversation_id: str
    role: str = "user"

# --- Conversation Helpers ---
async def get_or_create_doc_conversation(conversation_id: str) -> List[Dict[str, str]]:
    conversation_doc = await doc_conversation_collection.find_one({"_id": conversation_id})
    if conversation_doc:
        return conversation_doc.get("messages", [])
    else:
        new_conversation = [{
            "role": "system",
            "content": "Welcome to the document chat. Ask me anything about the document."
        }]
        await doc_conversation_collection.insert_one({
            "_id": conversation_id,
            "messages": new_conversation,
            "updated_at": datetime.utcnow()
        })
        return new_conversation

async def update_doc_conversation_in_db(conversation_id: str, messages: List[Dict[str, str]]):
    await doc_conversation_collection.update_one(
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

# --- API Endpoints ---

@router.post("/upload_document", dependencies=[Depends(JWTBearer())])
async def upload_document(document: Document, token: str = Depends(JWTBearer())):
    """
    Upload a document to the vector database.
    """
    vector_db.add_document(document.doc_id, document.title, document.content)
    return {"message": "Document uploaded successfully", "doc_id": document.doc_id}

@router.get("/doc_chats", dependencies=[Depends(JWTBearer())])
async def get_doc_chat_history(conversation_id: str = Query(..., description="The ID of the document conversation")):
    messages = await get_or_create_doc_conversation(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}

@router.post("/doc_chat", dependencies=[Depends(JWTBearer())])
async def doc_chat(input: DocUserInput, token: str = Depends(JWTBearer())):
    """
    Chat endpoint for interacting with a document.
    The conversation context is updated with both the user’s query and
    a snippet from the relevant document stored in the vector database.
    """
    # Decode the JWT token to get the username if needed.
    user_data = decode_access_token(token)
    username = user_data.get("sub")
    
    # Retrieve or create conversation history.
    messages = await get_or_create_doc_conversation(input.conversation_id)
    
    # Append the user's message.
    messages.append({"role": input.role, "content": input.message})
    
    # Retrieve the document from the vector database.
    doc = vector_db.get_document(input.doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document with id {input.doc_id} not found in vector database.")
    
    # Prepare a context message from the document.
    # You can adjust this snippet as needed (e.g., limiting the length).
    doc_context = (
        f"Document Title: {doc['title']}\n"
        f"Document Content (snippet): {doc['content'][:500]}"
    )
    messages.append({"role": "system", "content": doc_context})
    
    # Query the Groq API with the updated conversation context.
    response = query_groq_api(messages)
    
    # Append the assistant's response.
    messages.append({"role": "assistant", "content": response})
    await update_doc_conversation_in_db(input.conversation_id, messages)
    
    return {"response": response, "conversation_id": input.conversation_id}
