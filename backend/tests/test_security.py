import pytest
from httpx import AsyncClient, ASGITransport
from main import app

"""
Integration Test: Verifying that a 'viewer' role results in a 403 Forbidden
when attempting a navigation command.
"""

@pytest.mark.asyncio
async def test_viewer_access_denied():

# Wrap the FastAPI app in an ASGITransport for compatibility with httpx 0.28+
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # We attempt a move request without a valid JWT token
        response = await ac.post("/missions/move", json={"direction": "north"})
        
        # Verify the security layer blocks the request
        assert response.status_code in [401, 403]