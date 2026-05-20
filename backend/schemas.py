from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    # Defining input fields required for generating a new profile account
    username: str
    password: str
    role: Optional[str] = "viewer"

class UserLogin(BaseModel):
    # Verifying incoming credentials against existing storage parameters during login
    username: str
    password: str

class MoveRequest(BaseModel):
    # Structuring data payloads for executing navigation and steering actions
    username: str
    direction: str
    target_x: int = None
    target_y: int = None