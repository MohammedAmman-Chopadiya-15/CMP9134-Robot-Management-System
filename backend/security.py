from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# Setting up global security configurations for token generation parameters
SECRET_KEY = "SUPER_SECRET_ROBOT_KEY_CHANGE_ME" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Initializing the standard OAuth2 scheme for extracting login tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Creating the password hashing context utility using the bcrypt setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    # Converting raw text passwords into secure cryptographic hashes
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    # Comparing clear text input against saved database hashes during checks
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    # Packaging payload claims into an encoded JSON Web Token signature
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_data(token: str = Depends(oauth2_scheme)):
    try:
        # Extracting identity details directly from the provided authorization header
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "role": role}
    except JWTError:
        # Throwing access errors when token decoding fails security rules
        raise HTTPException(status_code=401, detail="Could not validate credentials")