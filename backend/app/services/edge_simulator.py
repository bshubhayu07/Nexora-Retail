import asyncio
import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.domain import ShopperTelemetry, QueueMetric, ShelfMetric, EdgeHardwareTelemetry, AlertLog
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
        # Stateful store conditions for stable judges demonstration
        self.aisle_3_stock = 14.5
        self.is_aisle_3_restocked = False
        self.queue_1_count = 6
        self.queue_2_count = 2
        self.counter_3_open = False
        self.active_shoppers = 32

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._simulation_loop())
            logger.info("Edge Camera Simulator started in Realistic Mode.")

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
                await asyncio.sleep(3.0)  # Stable 3.0s interval
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                await asyncio.sleep(3.0)

    async def _emit_simulated_frame(self, db: AsyncSession):
        # Check if Counter 3 is currently OPEN in database
        q3_stmt = select(QueueMetric).where(QueueMetric.queue_id == "queue-counter-3").order_by(QueueMetric.timestamp.desc()).limit(1)
        q3_res = await db.execute(q3_stmt)
        q3_rec = q3_res.scalars().first()
        self.counter_3_open = (q3_rec and q3_rec.cashier_status == "OPEN")

        # Check if Aisle 3 alerts were acknowledged / restocked
        alert_stmt = select(AlertLog).where(AlertLog.source_id == "shelf-aisle-3", AlertLog.is_acknowledged == False)
        alert_res = await db.execute(alert_stmt)
        has_pending_alert = alert_res.scalars().first() is not None

        if not has_pending_alert and self.aisle_3_stock < 80.0:
            # Gradually replenish stock up to 92%
            self.aisle_3_stock = min(92.0, self.aisle_3_stock + 15.0)

        # 1. Entrance Shopper Telemetry
        self.active_shoppers = max(20, min(50, self.active_shoppers + random.randint(-2, 2)))
        coords = []
        for _ in range(random.randint(8, 14)):
            coords.append({
                "x": round(random.uniform(15.0, 85.0), 1),
                "y": round(random.uniform(15.0, 85.0), 1),
                "dwell_sec": round(random.uniform(5.0, 30.0), 1)
            })
        
        telemetry = ShopperTelemetry(
            camera_id="cam-01-entrance",
            shopper_count=self.active_shoppers,
            avg_dwell_time_sec=round(random.uniform(160.0, 200.0), 1),
            spatial_coords=coords
        )
        db.add(telemetry)

        # 2. Checkout Queue Dynamics
        if self.counter_3_open:
            # Traffic redistributed smoothly
            self.queue_1_count = max(2, min(3, self.queue_1_count - 1))
            self.queue_2_count = max(2, min(3, self.queue_2_count))
            q3_count = 2
            q1_status = "OPEN"
        else:
            # Congestion builds at Counter 1
            self.queue_1_count = max(5, min(7, self.queue_1_count + random.choice([-1, 0, 1])))
            self.queue_2_count = 2
            q3_count = 0
            q1_status = "OVERLOADED" if self.queue_1_count >= 5 else "BUSY"

        q1_payload = QueueMetricPayload(
            camera_id="cam-02-checkout-1",
            queue_id="queue-counter-1",
            queue_name="Cashier Counter 1",
            shopper_count=self.queue_1_count,
            estimated_wait_sec=self.queue_1_count * 110.0,
            cashier_status=q1_status
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

        # 3. Shelf Inventory Metrics
        shelf_payload = ShelfMetricPayload(
            aisle_name="Aisle 3",
            category="Dairy & Milk",
            fill_percentage=round(self.aisle_3_stock, 1),
            product_count=max(2, int((self.aisle_3_stock / 100.0) * 40))
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
            fps=round(random.uniform(29.4, 30.0), 1),
            npu_load_pct=round(random.uniform(42.0, 52.0), 1),
            memory_usage_mb=round(random.uniform(490.0, 515.0), 1),
            inference_latency_ms=round(random.uniform(11.8, 12.8), 1),
            bandwidth_saved_mb=round(random.uniform(380.0, 440.0), 1)
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
                "active_shoppers": self.active_shoppers,
                "queue_1_count": self.queue_1_count,
                "queue_2_count": self.queue_2_count,
                "queue_3_count": q3_count,
                "counter_3_open": self.counter_3_open,
                "aisle_3_stock_pct": shelf_payload.fill_percentage,
                "npu_load_pct": hw_payload.npu_load_pct,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

edge_simulator = EdgeSimulator()

