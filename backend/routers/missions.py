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
    # 1. Security Check (RBAC)
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or user.role != "commander":
        raise HTTPException(status_code=403, detail="Only Commanders can move the robot")

    async with httpx.AsyncClient() as client:
        try:
            # A. Get Current Status and Map
            status_res = await client.get(f"{ROBOT_BASE_URL}/status")
            map_res = await client.get(f"{ROBOT_BASE_URL}/map")
            
            curr_pos = status_res.json()["position"]
            grid = map_res.json()["grid"]
            
            target_x, target_y = curr_pos["x"], curr_pos["y"]
            direction = data.direction.lower()

            # B. Calculate Target
            if direction == "north" and target_y < 20: target_y += 1
            elif direction == "south" and target_y > 0: target_y -= 1
            elif direction == "east" and target_x < 20: target_x += 1
            elif direction == "west" and target_x > 0: target_x -= 1

            # C. Safety Check: Is the target a wall?
            # Remember: Array index [0] is the top row (Y=20)
            if grid[20 - target_y][target_x] == 1:
                raise HTTPException(status_code=400, detail="Collision Imminent: Movement blocked by obstacle.")

            # D. Send the Move to Hardware
            robot_response = await client.post(
                f"{ROBOT_BASE_URL}/move", 
                json={"x": target_x, "y": target_y}
            )
            
            if robot_response.status_code != 200:
                raise HTTPException(status_code=502, detail="Robot rejected movement")
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware is offline")

    # 2. Log Success
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