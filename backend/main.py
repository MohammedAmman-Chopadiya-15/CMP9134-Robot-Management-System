import asyncio
import os
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import database
import models
from routers import auth, missions
from services.robot_client import RobotClient  # ✅ Singleton Import

# ---TELEMETRY SUBJECT ---
class TelemetrySubject:
    """
    Maintains a list of Observers (WebSockets) and notifies them whenever the Robot Hardware (the state) changes.
    """
    def __init__(self):
        self._observers: List[WebSocket] = []

    async def attach(self, websocket: WebSocket):
        """Register a new frontend observer."""
        await websocket.accept()
        self._observers.append(websocket)

    def detach(self, websocket: WebSocket):
        """Unregister an observer on disconnect."""
        if websocket in self._observers:
            self._observers.remove(websocket)

    async def notify(self, message: dict):
        """Broadcast updates to all active observers."""
        for connection in self._observers:
            try:
                await connection.send_json(message)
            except Exception:
                # Cleanup handled by disconnect event
                continue

# Instantiate the Subject
telemetry_notifier = TelemetrySubject()

# --- MODULAR TELEMETRY BROADCASTER ---
async def telemetry_broadcaster():
    """
    Service Layer logic: Uses the RobotClient Singleton to poll hardware
    and the TelemetrySubject to notify observers.
    """
    robot_service = RobotClient()  # Accessing the Singleton instance
    
    while True:
        try:
            response = await robot_service.get_robot_status()
            if response.status_code == 200:
                await telemetry_notifier.notify({
                    "type": "TELEMETRY_UPDATE",
                    "data": response.json()
                })
        except Exception:
            await telemetry_notifier.notify({
                "type": "ERROR", 
                "message": "Hardware link lost or unresponsive."
            })
        
        await asyncio.sleep(0.2)

# --- LIFESPAN MANAGEMENT ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    models.Base.metadata.create_all(bind=database.engine)
    broadcast_task = asyncio.create_task(telemetry_broadcaster())
    yield
    # SHUTDOWN
    broadcast_task.cancel()
    await RobotClient().close()  # Cleanly close Singleton connection pool

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

# --- WEBSOCKET GATEWAY---
@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await telemetry_notifier.attach(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        telemetry_notifier.detach(websocket)

# --- ROUTERS ---
app.include_router(auth.router)
app.include_router(missions.router)

@app.get("/")
def root():
    return {"status": "online", "architecture": "Modular Service-Oriented"}