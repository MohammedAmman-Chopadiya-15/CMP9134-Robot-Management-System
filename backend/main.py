import asyncio
import os
from typing import List
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import database
import models
from routers import auth, missions

# Establishing the database schema and engine connection on application startup
models.Base.metadata.create_all(bind=database.engine)



# --- DYNAMIC NETWORK CONFIGURATION (For Docker)---
# Prioritizing the environment variable 'ROBOT_API_URL' to support containerized orchestration (Docker). If it's missing, default to the local developer simulator.
ROBOT_BASE_URL = os.getenv("ROBOT_API_URL", "http://localhost:5000")
ROBOT_STATUS_URL = f"{ROBOT_BASE_URL}/api/status"

# --- MODERN LIFESPAN MANAGEMENT ---
@asynccontextmanager
async def lifespan(app: FastAPI):

    # RUNS ON STARTUP
    # Establishing the database schema
    models.Base.metadata.create_all(bind=database.engine)
    
    # Spawning the telemetry broadcaster as a persistent background task
    broadcast_task = asyncio.create_task(telemetry_broadcaster())
    
    yield # The application runs while this is suspended
    
    # RUNS ON SHUTDOWN
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Robot Management System API",
    description="A centralized gateway for secure robot telemetry and mission control.",
    lifespan=lifespan
)

# Configuring CORS to bridge the gap between the frontend UI and this API.
# Include local dev ports and standard Docker service mappings.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REAL-TIME SESSION MANAGEMENT ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # We iterate through connections and handle stale or closed sockets gracefully
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # If a socket fails, we ignore it here; cleanup happens in the disconnect handler
                continue

manager = ConnectionManager()

# --- HARDWARE TELEMETRY BROADCASTER ---
async def telemetry_broadcaster():
    async with httpx.AsyncClient() as client:
        while True:
            try:
                # Attempting to fetch the current hardware state from the simulator/robot
                response = await client.get(ROBOT_STATUS_URL, timeout=1.0)
                if response.status_code == 200:
                    await manager.broadcast({
                        "type": "TELEMETRY_UPDATE",
                        "data": response.json()
                    })
            except Exception:
                # If the hardware link is severed, inform the UI immediately
                await manager.broadcast({
                    "type": "ERROR", 
                    "message": "Hardware link lost or unresponsive."
                })
            
            await asyncio.sleep(0.2)

# --- WEBSOCKET GATEWAY ---
@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """
    Primary real-time data pipe. This endpoint maintains a persistent connection
    with the dashboard to stream the robot's live coordinates and status.
    """
    await manager.connect(websocket)
    try:
        while True:
            # We keep the connection alive by waiting for heartbeat signals from the client
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- ROUTER INTEGRATION ---
# Segmenting logic into auth and mission-specific domains for better maintainability
app.include_router(auth.router)
app.include_router(missions.router)

@app.get("/")
def root():
    """Simple health check to verify the API gateway is reachable."""
    return {
        "status": "online",
        "message": "Robot Management System Gateway is active.",
        "upstream_host": ROBOT_BASE_URL
    }