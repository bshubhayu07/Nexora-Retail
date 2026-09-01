import os
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.main import app
from app.database import init_db
from cv_edge.integration.backend_client import BackendIntegrationClient


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()


@pytest.mark.asyncio
async def test_edge_telemetry_integration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "camera_id": "cam-01-entrance",
            "shopper_count": 14,
            "avg_dwell_time_sec": 125.0,
            "spatial_coords": [{"x": 20.0, "y": 30.0, "dwell_sec": 15.0}]
        }
        res = await ac.post("/api/v1/edge/telemetry", json=payload)
        assert res.status_code == 201
        assert res.json()["status"] == "success"

        # Verify analytics overview reflects active shoppers
        overview_res = await ac.get("/api/v1/analytics/overview")
        assert overview_res.status_code == 200
        data = overview_res.json()
        assert data["active_shoppers_now"] == 14


@pytest.mark.asyncio
async def test_edge_queue_integration_and_alert():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Send queue metric with 6 shoppers (triggering warning/alert threshold)
        payload = {
            "camera_id": "cam-02-checkout-1",
            "queue_id": "queue-counter-1",
            "queue_name": "Cashier Counter 1",
            "shopper_count": 6,
            "estimated_wait_sec": 720.0,
            "cashier_status": "OVERLOADED"
        }
        res = await ac.post("/api/v1/edge/queue", json=payload)
        assert res.status_code == 201

        # Check queue status endpoint
        q_res = await ac.get("/api/v1/queue/status")
        assert q_res.status_code == 200
        queues = q_res.json()
        assert len(queues) > 0
        q1 = next(q for q in queues if q["queue_id"] == "queue-counter-1")
        assert q1["shopper_count"] == 6
        assert q1["cashier_status"] == "OVERLOADED"


@pytest.mark.asyncio
async def test_edge_shelf_integration_and_alert():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "aisle_name": "Aisle 3",
            "category": "Dairy & Milk",
            "fill_percentage": 12.5,
            "product_count": 3
        }
        res = await ac.post("/api/v1/edge/shelf", json=payload)
        assert res.status_code == 201

        # Check inventory endpoint
        inv_res = await ac.get("/api/v1/inventory/shelves")
        assert inv_res.status_code == 200
        shelves = inv_res.json()
        aisle3 = next(s for s in shelves if s["aisle_name"] == "Aisle 3")
        assert aisle3["fill_percentage"] == 12.5
        assert aisle3["status_label"] in ("LOW_STOCK", "CRITICAL_OUT_OF_STOCK")


@pytest.mark.asyncio
async def test_hardware_telemetry_integration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "device_id": "Laptop-Edge-Node-01",
            "fps": 24.5,
            "npu_load_pct": 52.0,
            "memory_usage_mb": 450.0,
            "inference_latency_ms": 41.0,
            "bandwidth_saved_mb": 512.0
        }
        res = await ac.post("/api/v1/edge/hardware", json=payload)
        assert res.status_code == 201

        hw_res = await ac.get("/api/v1/hardware/telemetry")
        assert hw_res.status_code == 200
        hw_data = hw_res.json()
        assert hw_data["device_id"] == "Laptop-Edge-Node-01"
        assert hw_data["fps"] == 24.5
