import asyncio
import random
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.domain import ShopperTelemetry, QueueMetric, ShelfMetric, EdgeHardwareTelemetry, Camera
from app.schemas.schemas import QueueMetricPayload, ShelfMetricPayload, EdgeHardwareTelemetryPayload
from app.services.alert_engine import AlertEngine
from app.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger("edge_simulator")

class EdgeSimulator:
    def __init__(self):
        self.is_running = False
        self._task = None
        self.frames_emitted = 0

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._simulation_loop())
            logger.info("Edge Camera Simulator started.")

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self._task:
                self._task.cancel()
            logger.info("Edge Camera Simulator stopped.")

    async def _simulation_loop(self):
        while self.is_running:
            try:
                async with AsyncSessionLocal() as db:
                    await self._emit_simulated_frame(db)
                self.frames_emitted += 1
                await asyncio.sleep(2.5)  # Emit frame update every 2.5 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                await asyncio.sleep(2.0)

    async def _emit_simulated_frame(self, db: AsyncSession):
        # 1. Entrance Shopper Telemetry
        active_shoppers = random.randint(15, 45)
        coords = []
        for _ in range(random.randint(6, 14)):
            coords.append({
                "x": round(random.uniform(10.0, 90.0), 1),
                "y": round(random.uniform(10.0, 90.0), 1),
                "dwell_sec": round(random.uniform(1.0, 15.0), 1)
            })
        
        telemetry = ShopperTelemetry(
            camera_id="cam-01-entrance",
            shopper_count=active_shoppers,
            avg_dwell_time_sec=round(random.uniform(18.0, 45.0), 1),
            spatial_coords=coords
        )
        db.add(telemetry)

        # 2. Checkout Queue 1 & Queue 2 Metrics
        q1_count = random.randint(2, 7)
        q1_est_wait = q1_count * 115.0
        q1_payload = QueueMetricPayload(
            camera_id="cam-02-checkout-1",
            queue_id="queue-counter-1",
            queue_name="Cashier Counter 1",
            shopper_count=q1_count,
            estimated_wait_sec=q1_est_wait,
            cashier_status="OVERLOADED" if q1_count >= 6 else "OPEN"
        )
        q1_metric = QueueMetric(
            camera_id=q1_payload.camera_id,
            queue_id=q1_payload.queue_id,
            queue_name=q1_payload.queue_name,
            shopper_count=q1_payload.shopper_count,
            estimated_wait_sec=q1_payload.estimated_wait_sec,
            cashier_status=q1_payload.cashier_status
        )
        db.add(q1_metric)
        await AlertEngine.evaluate_queue_telemetry(db, q1_payload)

        q2_count = random.randint(1, 4)
        q2_metric = QueueMetric(
            camera_id="cam-03-checkout-2",
            queue_id="queue-counter-2",
            queue_name="Cashier Counter 2",
            shopper_count=q2_count,
            estimated_wait_sec=q2_count * 110.0,
            cashier_status="OPEN"
        )
        db.add(q2_metric)

        # 3. Shelf Inventory Metrics (Aisle 3 Dairy fluctuating stock level)
        shelf_fill = random.uniform(12.0, 85.0)
        shelf_payload = ShelfMetricPayload(
            aisle_name="Aisle 3",
            category="Dairy & Milk",
            fill_percentage=round(shelf_fill, 1),
            product_count=max(2, int((shelf_fill / 100.0) * 40))
        )
        shelf_metric = ShelfMetric(
            aisle_name=shelf_payload.aisle_name,
            category=shelf_payload.category,
            fill_percentage=shelf_payload.fill_percentage,
            is_out_of_stock=shelf_payload.fill_percentage <= 20.0,
            product_count=shelf_payload.product_count
        )
        db.add(shelf_metric)
        await AlertEngine.evaluate_shelf_telemetry(db, shelf_payload)

        # 4. Qualcomm SNPE Hardware Telemetry
        hw_payload = EdgeHardwareTelemetryPayload(
            device_id="Qualcomm-Snapdragon-RB5-01",
            fps=round(random.uniform(28.5, 30.0), 1),
            npu_load_pct=round(random.uniform(35.0, 78.0), 1),
            memory_usage_mb=round(random.uniform(480.0, 530.0), 1),
            inference_latency_ms=round(random.uniform(11.2, 14.8), 1),
            bandwidth_saved_mb=round(random.uniform(120.0, 450.0), 1)
        )
        hw_metric = EdgeHardwareTelemetry(
            device_id=hw_payload.device_id,
            fps=hw_payload.fps,
            npu_load_pct=hw_payload.npu_load_pct,
            memory_usage_mb=hw_payload.memory_usage_mb,
            inference_latency_ms=hw_payload.inference_latency_ms,
            bandwidth_saved_mb=hw_payload.bandwidth_saved_mb
        )
        db.add(hw_metric)
        await db.commit()

        # 5. Broadcast frame update to frontend WebSockets
        await ws_manager.broadcast({
            "event": "TELEMETRY_UPDATE",
            "data": {
                "active_shoppers": active_shoppers,
                "queue_1_count": q1_count,
                "queue_2_count": q2_count,
                "aisle_3_stock_pct": shelf_payload.fill_percentage,
                "npu_load_pct": hw_payload.npu_load_pct,
                "timestamp": datetime.utcnow().isoformat()
            }
        })

edge_simulator = EdgeSimulator()
