from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import httpx
import models, database
from routers import auth, missions
from typing import List

# Initialize Database
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Robot Management System API")

# Robot Hardware URL (Internal)
ROBOT_STATUS_URL = "http://localhost:5000/api/status"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                continue

manager = ConnectionManager()

# --- BACKGROUND BROADCASTER ---
async def telemetry_broadcaster():
    """Polls hardware status every 200ms and pushes to all UI clients."""
    async with httpx.AsyncClient() as client:
        while True:
            try:
                response = await client.get(ROBOT_STATUS_URL, timeout=1.0)
                if response.status_code == 200:
                    await manager.broadcast({
                        "type": "TELEMETRY_UPDATE",
                        "data": response.json()
                    })
            except Exception:
                await manager.broadcast({
                    "type": "ERROR", 
                    "message": "Hardware Link Lost"
                })
            
            # Update frequency: 5 times per second
            await asyncio.sleep(0.2)

@app.on_event("startup")
async def startup_event():
    # Start the broadcaster task when the API starts
    asyncio.create_task(telemetry_broadcaster())

# --- WEBSOCKET ENDPOINT ---
@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; receive_text prevents the socket from closing
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

app.include_router(auth.router)
app.include_router(missions.router)

@app.get("/")
def root():
    return {"message": "Cloud API Gateway Active"}