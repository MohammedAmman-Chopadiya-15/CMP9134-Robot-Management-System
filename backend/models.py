from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    command = Column(String)       # e.g., "MOVE_NORTH", "GRAB"
    status = Column(String)        # e.g., "SUCCESS", "FAILED"
    robot_id = Column(String)      # The ID of the robot controlled
    timestamp = Column(DateTime, default=datetime.utcnow)