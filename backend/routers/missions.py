from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, database

router = APIRouter(
    prefix="/missions",
    tags=["Missions"]
)

@router.post("/move") # Use @router
def move_robot(data: schemas.MoveRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or user.role != "commander":
        raise HTTPException(status_code=403, detail="Only Commanders can move the robot")

    new_mission = models.Mission(
        robot_id="ROBOT_01",
        command=f"MOVE_{data.direction.upper()}",
        status="SUCCESS"
    )
    db.add(new_mission)
    db.commit()
    
    return {"message": f"Successfully moved {data.direction}", "status": "SUCCESS"}