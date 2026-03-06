from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import models, schemas, database

ROBOT_BASE_URL = "http://localhost:5000/api"

router = APIRouter(
    prefix="/missions",
    tags=["Missions"]
)

@router.get("/status")
async def get_robot_hardware_status():
    """Checks if the Robot Docker container is reachable."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/status", timeout=1.0)
            return {"connected": True, "details": response.json()}
        except httpx.RequestError:
            return {"connected": False, "message": "Robot container unreachable on port 5000"}

@router.post("/move")
async def move_robot(data: schemas.MoveRequest, db: Session = Depends(database.get_db)):
    # 1. RBAC Check (Commander only)
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or user.role != "commander":
        raise HTTPException(status_code=403, detail="Only Commanders can move the robot")

    # 2. Forward the command to the actual Robot Docker Container
    async with httpx.AsyncClient() as client:
        try:
            robot_response = await client.post(
                f"{ROBOT_BASE_URL}/move", 
                json={"direction": data.direction.lower()}
            )
            
            if robot_response.status_code != 200:
                raise HTTPException(status_code=502, detail="Robot rejected the movement command")
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware is offline")

    # 3. If successful, Log the mission to SQLite
    new_mission = models.Mission(
        robot_id="ROBOT_01",
        command=f"MOVE_{data.direction.upper()}",
        status="SUCCESS"
    )
    db.add(new_mission)
    db.commit()
    
    return {"message": f"Successfully moved {data.direction}", "status": "SUCCESS"}

@router.get("/history")
def get_mission_history(db: Session = Depends(database.get_db)):
    # Returns the 10 most recent missions, newest first
    return db.query(models.Mission).order_by(models.Mission.timestamp.desc()).limit(10).all()

@router.get("/map")
async def get_robot_map():
    """Proxy to fetch the 2D grid from the robot hardware."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/map", timeout=2.0)
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot map data unreachable")