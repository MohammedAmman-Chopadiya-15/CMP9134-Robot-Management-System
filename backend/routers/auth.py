from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
# Note: Since these are in the parent 'backend' folder, we use absolute imports
import models, schemas, database 

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register") # Changed from @app to @router
def register(user_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    exists = db.query(models.User).filter(models.User.username == user_data.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    new_user = models.User(
        username=user_data.username,
        password=user_data.password,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/login") # Changed from @app to @router
def login(user_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(
        models.User.username == user_data.username,
        models.User.password == user_data.password
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"username": user.username, "role": user.role}