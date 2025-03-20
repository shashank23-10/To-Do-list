from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.auth.auth_handler import get_password_hash, verify_password, create_access_token
from app.database import user_collection

router = APIRouter()

# User Schema
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# Register New User
@router.post("/signup")
async def register_user(user: UserCreate):
    existing_user = await user_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = get_password_hash(user.password)
    new_user = {
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "password": hashed_password
    }

    await user_collection.insert_one(new_user)
    return {"message": "User created successfully"}

# Login User & Generate JWT Token
@router.post("/login", tags=["Users"])
async def login_user(user: UserLogin):
    db_user = await user_collection.find_one({"username": user.username})
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}
