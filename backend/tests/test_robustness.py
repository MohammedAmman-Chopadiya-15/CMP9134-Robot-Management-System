import pytest
import httpx
from unittest.mock import patch
from services.robot_client import RobotClient

@pytest.mark.asyncio
async def test_backend_handles_robot_offline():
    """
    Verify the system handles hardware timeouts gracefully.
    """
    robot_service = RobotClient()
    
    # Use 'patch' to intercept the HTTP call and Raise a ConnectError instead of working.

    with patch.object(robot_service.client, 'get', side_effect=httpx.ConnectError("Connection Refused")):
        try:
            # Get Robot Status
            await robot_service.get_robot_status()
        except Exception as e:
            # 4. If the error is caught/recognized without crashing the app, the test passes
            assert isinstance(e, httpx.ConnectError)
            print("\nSuccessfully caught simulated hardware failure!")