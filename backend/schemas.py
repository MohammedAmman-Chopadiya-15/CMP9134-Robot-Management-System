from pydantic import BaseModel
from typing import Optional

# What a user looks like when they Register
class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "viewer"

# What a user looks like when they Login
class UserLogin(BaseModel):
    username: str
    password: str

# What a movement command looks like
class MoveRequest(BaseModel):
    username: str
    direction: str