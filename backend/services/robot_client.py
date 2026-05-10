import httpx
import os
import asyncio

class RobotClient:
    """
    Ensures a single persistent connection pool to the robot hardware. 
    
    This prevents socket exhaustion and reduces overhead during high-frequency polling.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RobotClient, cls).__new__(cls)
            # Initialize the internal HTTPX client only once
            base_url = os.getenv("ROBOT_API_URL", "http://localhost:5000")
            cls._instance.client = httpx.AsyncClient(
                base_url=base_url, 
                timeout=1.0,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
            )
        return cls._instance

    async def get_robot_status(self):
        """Encapsulated business logic for fetching telemetry."""
        return await self.client.get("/api/status")

    async def close(self):
        """Graceful shutdown of the connection pool."""
        await self.client.aclose()