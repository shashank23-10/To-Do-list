from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.tasks import router as task_router
from app.routes.auth_routes import router as auth_router
from app.routes.conversations import router as conversation_router  # <-- Import the conversations router

app = FastAPI()

@app.get('/')
async def home():
    return {'message': 'Hello, it is working fine.'}

# Set the list of allowed origins
origins = [
    "http://localhost:3000",
]

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with correct prefixes
app.include_router(task_router, prefix="/tasks", tags=["Tasks"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(conversation_router, prefix="/ws", tags=["Conversations"])  # <-- Include the WebSocket router
