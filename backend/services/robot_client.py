import httpx
import os
import asyncio

class RobotClient:
    _instance = None

    def __new__(cls):
        # Checking if a singleton instance already exists
        if cls._instance is None:
            cls._instance = super(RobotClient, cls).__new__(cls)
            base_url = os.getenv("ROBOT_API_URL", "http://localhost:5000")
            # Creating a persistent connection pool with configuration limits
            cls._instance.client = httpx.AsyncClient(
                base_url=base_url, 
                timeout=1.0,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
            )
        return cls._instance

    async def get_robot_status(self):
        # Fetching telemetry data from the robot endpoint asynchronously
        return await self.client.get("/api/status")

    async def close(self):
        # Terminating the underlying client connection pool gracefully
        await self.client.aclose()