from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models, database
from routers import auth, missions # Import your new routers

# Initialize Database
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Robot Management System API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(missions.router)

@app.get("/")
def root():
    return {"message": "Cloud API Gateway Active"}