from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, database

# Create the tables in the .db file
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Your existing CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Cloud Backend Active & Database Initialized!"}

# A test route to check if we can write to the DB
@app.post("/test-log")
def create_test_log(db: Session = Depends(database.get_db)):
    new_mission = models.Mission(
        command="INIT_TEST", 
        status="SUCCESS", 
        robot_id="ROBOT_01"
    )
    db.add(new_mission)
    db.commit()
    db.refresh(new_mission)
    return {"status": "Log Created", "id": new_mission.id}