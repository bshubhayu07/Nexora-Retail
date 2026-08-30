import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()

@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

@pytest.mark.asyncio
async def test_ingest_shopper_telemetry():
    payload = {
        "camera_id": "cam-01-entrance",
        "shopper_count": 25,
        "avg_dwell_time_sec": 140.0,
        "spatial_coords": [{"x": 15.5, "y": 22.0, "dwell_sec": 12.0}]
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/edge/telemetry", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "success"

@pytest.mark.asyncio
async def test_analytics_overview():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_footfall_today" in data
    assert "active_shoppers_now" in data

@pytest.mark.asyncio
async def test_store_heatmap():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/analytics/heatmap")
    assert response.status_code == 200
    data = response.json()
    assert data["grid_size"] == 20
    assert isinstance(data["points"], list)

@pytest.mark.asyncio
async def test_queue_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/queue/status")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_inventory_shelves():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/inventory/shelves")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_hardware_telemetry():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/hardware/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert "device_id" in data
    assert "npu_load_pct" in data

@pytest.mark.asyncio
async def test_copilot_chat():
    payload = {
        "user_query": "Why is the checkout queue backed up?",
        "use_llama": True
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/copilot/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "llama_response" in data
    assert len(data["llama_response"]) > 10
