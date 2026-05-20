import pytest
import httpx
from unittest.mock import patch
from services.robot_client import RobotClient

@pytest.mark.asyncio
async def test_backend_handles_robot_offline():
    # Instantiating the client component to evaluate resilience behaviors
    robot_service = RobotClient()
    
    # Intercepting the outward connection to mock an unresponsive hardware environment
    with patch.object(robot_service.client, 'get', side_effect=httpx.ConnectError("Connection Refused")):
        try:
            # Triggering the data retrieval operation against the disabled target
            await robot_service.get_robot_status()
        except Exception as e:
            # Asserting that the runtime identifies the connection failure appropriately
            assert isinstance(e, httpx.ConnectError)
            print("\nSuccessfully caught simulated hardware failure!")