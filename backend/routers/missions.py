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
    # 1. RBAC Check
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or user.role != "commander":
        raise HTTPException(status_code=403, detail="Only Commanders can move the robot")

    async with httpx.AsyncClient() as client:
        try:
            # 2. Get Current Status and Map
            status_res = await client.get(f"{ROBOT_BASE_URL}/status")
            map_res = await client.get(f"{ROBOT_BASE_URL}/map")
            
            curr_pos = status_res.json()["position"]
            grid = map_res.json()["grid"]
            
            # 3. Calculate Target
            target_x, target_y = curr_pos["x"], curr_pos["y"]
            
            # CHECK: Are we doing Relative (direction) or Absolute (manual) move?
            if data.direction == "manual":
                # Use absolute coordinates from frontend
                target_x = data.target_x
                target_y = data.target_y
            else:
                # Use relative direction logic
                direction = data.direction.lower()
                if direction == "north" and target_y < 20: target_y += 1
                elif direction == "south" and target_y > 0: target_y -= 1
                elif direction == "east" and target_x < 20: target_x += 1
                elif direction == "west" and target_x > 0: target_x -= 1

            # 4. Safety Check: Obstacle or Out of Bounds
            if target_x < 0 or target_x > 20 or target_y < 0 or target_y > 20:
                raise HTTPException(status_code=400, detail="Target out of bounds")
                
            if grid[20 - target_y][target_x] == 1:
                raise HTTPException(status_code=400, detail="Collision Imminent: Targeted location is blocked.")

            # 5. Send to Hardware
            robot_response = await client.post(
                f"{ROBOT_BASE_URL}/move", 
                json={"x": target_x, "y": target_y}
            )
            
            if robot_response.status_code != 200:
                raise HTTPException(status_code=502, detail="Robot rejected movement")
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware is offline")

    # 6. Log Mission
    cmd_text = f"GOTO_{target_x}_{target_y}" if data.direction == "manual" else f"MOVE_{data.direction.upper()}"
    new_mission = models.Mission(
        robot_id="XR-900",
        command=cmd_text,
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
        
@router.post("/reset")
async def reset_robot_hardware(username: str, db: Session = Depends(database.get_db)):

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or user.role != "commander":
        raise HTTPException(status_code=403, detail="Unauthorized: Reset requires Commander privileges")

    async with httpx.AsyncClient() as client:
        try:
            # 2. Forward to Robot Container
            response = await client.post(f"{ROBOT_BASE_URL}/reset", timeout=5.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Hardware reset failed")
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware unreachable")

    # 3. Log the system-level reset mission
    new_mission = models.Mission(
        robot_id="XR-900",
        command="SYSTEM_RESET",
        status="SUCCESS"
    )
    db.add(new_mission)
    db.commit()
    
    return {"message": "System reset successful", "status": "SUCCESS"}