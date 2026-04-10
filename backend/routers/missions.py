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
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/status", timeout=1.0)
            return {"connected": True, "details": response.json()}
        except httpx.RequestError:
            return {"connected": False, "message": "Robot container unreachable"}

@router.post("/move")
async def move_robot(data: schemas.MoveRequest, db: Session = Depends(database.get_db)):
    # 1. RBAC Check
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or user.role != "commander":
        raise HTTPException(status_code=403, detail="Only Commanders can move the robot")

    async with httpx.AsyncClient() as client:
        try:
            # 2. Get Current Hardware State
            status_res = await client.get(f"{ROBOT_BASE_URL}/status")
            curr_pos = status_res.json()["position"]
            target_x, target_y = curr_pos["x"], curr_pos["y"]
            
            # 3. Handle Relative Directional Movement
            direction = data.direction.lower()
            if direction == "north" and target_y < 20: target_y += 1
            elif direction == "south" and target_y > 0: target_y -= 1
            elif direction == "east" and target_x < 20: target_x += 1
            elif direction == "west" and target_x > 0: target_x -= 1

            # 4. Safety Check (Out of Bounds)
            if target_x < 0 or target_x > 20 or target_y < 0 or target_y > 20:
                raise HTTPException(status_code=400, detail="Target out of bounds")

            # 5. Execute Command
            robot_response = await client.post(
                f"{ROBOT_BASE_URL}/move", 
                json={"x": target_x, "y": target_y}
            )
            
            if robot_response.status_code != 200:
                raise HTTPException(status_code=502, detail="Robot rejected movement")
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware is offline")

    # 6. Log Mission
    new_mission = models.Mission(
        robot_id="XR-900",
        command=f"MOVE_{data.direction.upper()}",
        status="SUCCESS"
    )
    db.add(new_mission)
    db.commit()
    
    return {"status": "SUCCESS", "new_position": {"x": target_x, "y": target_y}}

@router.get("/history")
def get_mission_history(db: Session = Depends(database.get_db)):
    return db.query(models.Mission).order_by(models.Mission.timestamp.desc()).limit(15).all()

@router.get("/map")
async def get_robot_map():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/map", timeout=2.0)
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot map data unreachable")