from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.auth.auth_handler import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user  # Ensure this dependency is implemented
)
from app.database import user_collection

# Ensure Router Uses "/auth"
router = APIRouter(prefix="/auth", tags=["Auth"])  

# Define User Schema
class UserCreate(BaseModel):
    name: str
    email: str  # Just a string now
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# Register New User
@router.post("/signup", summary="Register a new user")
async def register_user(user: UserCreate):
    existing_user = await user_collection.find_one({"username": user.username.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = get_password_hash(user.password)
    new_user = {
        "name": user.name,
        "email": user.email,
        "username": user.username.lower(),
        "password": hashed_password
    }

    await user_collection.insert_one(new_user)
    return {"message": "User created successfully"}

# Login User & Generate JWT Token
@router.post("/login", summary="Login user and get JWT token")
async def login_user(user: UserLogin):
    db_user = await user_collection.find_one({"username": user.username.lower()})
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": db_user["username"]})
    return {"access_token": token, "token_type": "bearer"}

# Delete User Account
@router.delete("/delete", summary="Delete user account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    deletion_result = await user_collection.delete_one({"username": current_user["username"]})
    if deletion_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User account deleted successfully"}

# Get All Users
@router.get("/all", summary="Get all users")
async def get_all_users():
    users_cursor = user_collection.find({})
    users = await users_cursor.to_list(length=None)
    # Remove sensitive fields before returning
    sanitized_users = [
        {
            "name": user.get("name"),
            "email": user.get("email"),
            "username": user.get("username")
        }
        for user in users
    ]
    return {"users": sanitized_users}