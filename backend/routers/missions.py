import os
import httpx
from typing import List
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

import models, schemas, database, security

# --- DYNAMIC HARDWARE CONFIGURATION ---
# Ensure the API can discover the robot simulator within the Docker network. If not, fallback to a local developer environment on port 5000.
ROBOT_HOST = os.getenv("ROBOT_API_URL", "http://localhost:5000")
ROBOT_BASE_URL = f"{ROBOT_HOST}/api"

router = APIRouter(
    prefix="/missions",
    tags=["Missions"]
)

# --- TELEMETRY & DIAGNOSTICS ---

# Fetch all the basic info from robot container's /status endpoint
@router.get("/status")
async def get_robot_hardware_status(current_user: dict = Depends(security.get_current_user_data)):
    """
    Performs a high-level health check on the hardware link.
    Accessible to all authenticated personnel to ensure situational awareness.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/status", timeout=1.0)
            return {"connected": True, "details": response.json()}
        except httpx.RequestError:
            return {"connected": False, "message": "The robot interface is currently unreachable."}

# Get a list of all telemetry commands in the correct order for a clear audit trail.
@router.get("/history")
def get_mission_history(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user_data)
):
    return db.query(models.Mission).order_by(models.Mission.timestamp.desc()).limit(10).all()


# Gets the 21*21 grid matrix that will be shown as the map on UI
@router.get("/map")
async def get_robot_map(current_user: dict = Depends(security.get_current_user_data)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ROBOT_BASE_URL}/map", timeout=2.0)
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Unable to retrieve environment mapping from hardware.")

# --- PROTECTED COMMAND OPERATIONS ---

@router.post("/move")
async def move_robot(
    data: schemas.MoveRequest, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user_data)
):
    """
    Executes a movement directive. This route enforces strict RBAC, ensuring
    only authorized Commanders can influence the robot's physical state.
    """
    # Validation: Ensure the role is commander
    if current_user["role"] != "commander":
        raise HTTPException(status_code=403, detail="Clearance Denied: Operational control is reserved for Commanders.")

    async with httpx.AsyncClient() as client:
        try:
            # Synchronizing with the robot to determine the current starting vector
            status_res = await client.get(f"{ROBOT_BASE_URL}/status")
            curr_pos = status_res.json()["position"]
            target_x, target_y = curr_pos["x"], curr_pos["y"]

            # Calculating the intended destination based on command type
            if data.direction == "manual":
                target_x, target_y = data.target_x, data.target_y
            else:
                direction = data.direction.lower()
                if direction == "north" and target_y < 20: target_y += 1
                elif direction == "south" and target_y > 0: target_y -= 1
                elif direction == "east" and target_x < 20: target_x += 1
                elif direction == "west" and target_x > 0: target_x -= 1

            # Safety Guard: Prevent hardware damage by enforcing operational boundaries
            if not (0 <= target_x <= 20 and 0 <= target_y <= 20):
                raise HTTPException(status_code=400, detail="Movement vector exceeds defined operational bounds.")

            # Forwarding the validated command to the physical hardware
            robot_response = await client.post(
                f"{ROBOT_BASE_URL}/move", 
                json={"x": target_x, "y": target_y}
            )
            
            if robot_response.status_code != 200:
                error_detail = robot_response.json().get("detail", "Hardware rejected the motion command.")
                raise HTTPException(status_code=400, detail=error_detail)
                
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Hardware communication timeout: Connection lost.")

    # Logging the event for the Audit Trail
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
    current_user: dict = Depends(security.get_current_user_data)
):
    """
    Initiates an emergency system reset. This clears hardware buffers 
    and returns the system to a known baseline state.
    """
    if current_user["role"] != "commander":
        raise HTTPException(status_code=403, detail="Clearance Denied: Emergency overrides require Commander privileges.")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{ROBOT_BASE_URL}/reset", timeout=5.0)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Critical: Hardware failed to acknowledge reset sequence.")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Unable to establish link for system reset.")

    # Finalizing the reset log entry
    new_mission = models.Mission(robot_id="XR-900", command="SYSTEM_RESET", status="SUCCESS")
    db.add(new_mission)
    db.commit()
    
    return {"message": "Emergency reset successful. System recalibrated.", "status": "SUCCESS"}