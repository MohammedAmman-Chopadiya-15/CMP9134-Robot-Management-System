import asyncio
import os
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import database
import models
from routers import auth, missions

from services.robot_client import RobotClient
from database import SessionLocal
from init_db import seed_default_users

# --- TELEMETRY SUBJECT ---
class TelemetrySubject:
    # Managing a dynamic roster of connected client observers
    def __init__(self):
        self._observers: List[WebSocket] = []

    async def attach(self, websocket: WebSocket):
        # Accepting the handshake and tracking the new subscriber connection
        await websocket.accept()
        self._observers.append(websocket)

    def detach(self, websocket: WebSocket):
        # Dropping the inactive user channel from the tracking system
        if websocket in self._observers:
            self._observers.remove(websocket)

    async def notify(self, message: dict):
        # Distributing state updates across all connected subscriber terminals
        for connection in self._observers:
            try:
                await connection.send_json(message)
            except Exception:
                continue


telemetry_notifier = TelemetrySubject()

# --- MODULAR TELEMETRY BROADCASTER ---
async def telemetry_broadcaster():
    # Hooking into the centralized connection engine instance
    robot_service = RobotClient()
    
    while True:
        try:
            # Polling current metrics directly from the machine hardware interface
            response = await robot_service.get_robot_status()
            if response.status_code == 200:
                # Pushing updated metrics out to all listening app interfaces
                await telemetry_notifier.notify({
                    "type": "TELEMETRY_UPDATE",
                    "data": response.json()
                })
        except Exception:
            # Broadcasting alerts when communication links drop unexpectedly
            await telemetry_notifier.notify({
                "type": "ERROR", 
                "message": "Hardware link lost or unresponsive."
            })
        
        await asyncio.sleep(0.2)

# --- LIFESPAN MANAGEMENT ---
@asynccontextmanager
async def lifespan(app: FastAPI):

    # ------------------ STARTUP ------------------
    # 1. Initialize DB structures
    models.Base.metadata.create_all(bind=database.engine)
    
    # 2. Run data seed matrix for Commander & Viewer
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()
        
    # 3. Spin up asynchronous telemetry polling loops
    broadcast_task = asyncio.create_task(telemetry_broadcaster())
    
    yield
    
    # ------------------ SHUTDOWN ------------------
    broadcast_task.cancel()
    await RobotClient().close()  # Cleanly closes Singleton connection pool

app = FastAPI(
    title="Robot Management System API",
    description="Refactored with Observer and Singleton Design Patterns.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEBSOCKET GATEWAY ---
@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    # Linking incoming network requests to our event notification system
    await telemetry_notifier.attach(websocket)
    try:
        while True:
            # Keeping the open pipeline alive by waiting for incoming heartbeats
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Erasing the socket reference when user terminals disconnect
        telemetry_notifier.detach(websocket)

# --- ROUTERS ---
app.include_router(auth.router)
app.include_router(missions.router)

@app.get("/")
def root():
    return {"status": "online", "architecture": "Modular Service-Oriented"}