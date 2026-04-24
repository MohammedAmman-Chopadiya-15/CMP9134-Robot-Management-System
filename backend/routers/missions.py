from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import models, schemas, database, security # Added security import

ROBOT_BASE_URL = "http://localhost:5000/api"

router = APIRouter(
    prefix="/missions",
    tags=["Missions"]
)

# --- SECURE TELEMETRY ROUTES ---

@router.get("/status")
async def get_robot_hardware_status(current_user: dict = Depends(security.get_current_user_data)):
    """Checks hardware status. Accessible by any authenticated user (Viewer/Commander)."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/status", timeout=1.0)
            return {"connected": True, "details": response.json()}
        except httpx.RequestError:
            return {"connected": False, "message": "Robot container unreachable"}

@router.get("/history")
def get_mission_history(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user_data)
):
    """Returns mission audit trail for authenticated users."""
    return db.query(models.Mission).order_by(models.Mission.timestamp.desc()).limit(10).all()

@router.get("/map")
async def get_robot_map(current_user: dict = Depends(security.get_current_user_data)):
    """Proxy for 2D grid data. Authenticated access only."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/map", timeout=2.0)
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot map data unreachable")

# --- SECURE COMMAND ROUTES (RBAC PROTECTED) ---

@router.post("/move")
async def move_robot(
    data: schemas.MoveRequest, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user_data) # 🔒 JWT Guard
):

    if current_user["role"] != "commander":
        raise HTTPException(status_code=403, detail="RBAC: Only Commanders can move the robot")

    async with httpx.AsyncClient() as client:
        try:
            # Synchronize position
            status_res = await client.get(f"{ROBOT_BASE_URL}/status")
            curr_pos = status_res.json()["position"]
            target_x, target_y = curr_pos["x"], curr_pos["y"]

            if data.direction == "manual":
                target_x, target_y = data.target_x, data.target_y
            else:
                direction = data.direction.lower()
                if direction == "north" and target_y < 20: target_y += 1
                elif direction == "south" and target_y > 0: target_y -= 1
                elif direction == "east" and target_x < 20: target_x += 1
                elif direction == "west" and target_x > 0: target_x -= 1

            if not (0 <= target_x <= 20 and 0 <= target_y <= 20):
                raise HTTPException(status_code=400, detail="Target out of bounds")

            robot_response = await client.post(
                f"{ROBOT_BASE_URL}/move", 
                json={"x": target_x, "y": target_y}
            )
            
            if robot_response.status_code != 200:
                error_detail = robot_response.json().get("detail", "Movement rejected")
                raise HTTPException(status_code=400, detail=error_detail)
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware offline")


    cmd_text = f"GOTO_{target_x}_{target_y}" if data.direction == "manual" else f"MOVE_{data.direction.upper()}"
    new_mission = models.Mission(
        robot_id="XR-900", 
        command=cmd_text, 
        status="SUCCESS",

    )
    db.add(new_mission)
    db.commit()
    
    return {"status": "SUCCESS", "new_position": {"x": target_x, "y": target_y}}

@router.post("/reset")
async def reset_robot_hardware(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user_data) # 🔒 JWT Guard
):

    if current_user["role"] != "commander":
        raise HTTPException(status_code=403, detail="Unauthorized: Reset requires Commander privileges")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{ROBOT_BASE_URL}/reset", timeout=5.0)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Hardware reset failed")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Robot hardware unreachable")

    new_mission = models.Mission(robot_id="XR-900", command="SYSTEM_RESET", status="SUCCESS")
    db.add(new_mission)
    db.commit()
    
    return {"message": "System reset successful", "status": "SUCCESS"}