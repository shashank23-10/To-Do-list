from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.tasks import router as task_router
from app.routes.auth_routes import router as auth_router
from app.routes.conversations import router as conversation_router  
from app.routes.ai import router as ai_router

app = FastAPI()

@app.get('/')
async def home():
    return {'message': 'Hello, it is working fine.'}

# Allowed origins (adjust if needed)
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with the proper prefixes.
app.include_router(task_router, prefix="/tasks", tags=["Tasks"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(conversation_router, prefix="/ws", tags=["Conversations"]) 
app.include_router(ai_router, prefix="/api/todo-ai", tags=["ToDo-AI"])
