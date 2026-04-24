from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)  # In a real app, we would hash this!
    role = Column(String)      # "commander" or "viewer"

class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    command = Column(String)       # e.g., "MOVE_NORTH", "GRAB"
    status = Column(String)        # e.g., "SUCCESS", "FAILED"
    robot_id = Column(String)      # The ID of the robot controlled
    timestamp = Column(DateTime, default=datetime.utcnow)