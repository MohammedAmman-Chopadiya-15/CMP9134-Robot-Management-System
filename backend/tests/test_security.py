import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_viewer_access_denied():

    # Configuring the execution context to route through the local application instance
    transport = ASGITransport(app=app)
    
    # Establishing an isolated mock network pipeline for testing endpoint parameters
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Dispatching an unauthorized coordinate update command to verify permission boundaries
        response = await ac.post("/missions/move", json={"direction": "north"})
        
        # Validating that the core security layer intercepts the call with rejected status codes
        assert response.status_code in [401, 403]