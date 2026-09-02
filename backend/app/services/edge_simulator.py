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

        self.aisle_3_stock = 60.0
        self.is_aisle_3_restocked = False

        self.queue_1_count = 6
        self.queue_2_count = 2
        self.queue_3_count = 0

        self.counter_1_open = True
        self.counter_2_open = True
        self.counter_3_open = False

        self.active_shoppers = 32
        self._startup_initialized = False

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._startup_initialized = False
            self._task = asyncio.create_task(self._simulation_loop())
            logger.info("Edge Camera Simulator started in Realistic Mode.")

    def stop(self):
        if self.is_running:
            self.is_running = False

            if self._task:
                self._task.cancel()

            self._task = None
            logger.info("Edge Camera Simulator stopped.")

    async def _simulation_loop(self):
        while self.is_running:
            try:
                async with AsyncSessionLocal() as db:
                    if not self._startup_initialized:
                        await self._initialize_startup_state(db)
                        self._startup_initialized = True

                    await self._emit_simulated_frame(db)

                self.frames_emitted += 1
                await asyncio.sleep(3.0)

            except asyncio.CancelledError:
                break

            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                await asyncio.sleep(3.0)

    async def _initialize_startup_state(self, db: AsyncSession):
        self.counter_1_open = True
        self.counter_2_open = True
        self.counter_3_open = False

        startup_states = [
            {
                "queue_id": "queue-counter-1",
                "queue_name": "Cashier Counter 1",
                "camera_id": "cam-02-checkout-1",
                "open": True,
                "count": max(4, self.queue_1_count),
            },
            {
                "queue_id": "queue-counter-2",
                "queue_name": "Cashier Counter 2",
                "camera_id": "cam-03-checkout-2",
                "open": True,
                "count": max(1, self.queue_2_count),
            },
            {
                "queue_id": "queue-counter-3",
                "queue_name": "Cashier Counter 3",
                "camera_id": "cam-04-checkout-3",
                "open": False,
                "count": 0,
            },
        ]

        for state in startup_states:
            metric = QueueMetric(
                camera_id=state["camera_id"],
                queue_id=state["queue_id"],
                queue_name=state["queue_name"],
                shopper_count=state["count"],
                estimated_wait_sec=state["count"] * 110.0,
                cashier_status="OPEN" if state["open"] else "CLOSED",
                is_bottleneck=False,
            )

            db.add(metric)

        self.queue_3_count = 0

        await db.commit()

        await ws_manager.broadcast({
            "event": "QUEUE_ACTION",
            "data": {
                "queue_id": "queue-counter-3",
                "action": "CLOSE",
                "status": "CLOSED",
                "message": "Cashier Counter 3 is closed at simulator startup."
            }
        })

    async def _get_counter_states(self, db: AsyncSession):
        counter_ids = [
            "queue-counter-1",
            "queue-counter-2",
            "queue-counter-3",
        ]

        states = {}

        for queue_id in counter_ids:
            stmt = (
                select(QueueMetric)
                .where(QueueMetric.queue_id == queue_id)
                .order_by(QueueMetric.timestamp.desc())
                .limit(1)
            )

            result = await db.execute(stmt)
            record = result.scalars().first()

            if record:
                states[queue_id] = record.cashier_status != "CLOSED"

        if "queue-counter-1" not in states:
            states["queue-counter-1"] = True

        if "queue-counter-2" not in states:
            states["queue-counter-2"] = True

        if "queue-counter-3" not in states:
            states["queue-counter-3"] = False

        return states

    def _queue_change(self, max_increase: int):
        if max_increase == 2:
            return random.choices(
                [-2, -1, 0, 1, 2],
                weights=[10, 20, 30, 25, 15],
                k=1
            )[0]

        if max_increase == 3:
            return random.choices(
                [-3, -2, -1, 0, 1, 2, 3],
                weights=[5, 10, 20, 25, 20, 15, 5],
                k=1
            )[0]

        return random.choices(
            [-4, -3, -2, -1, 0, 1, 2, 3, 4],
            weights=[4, 6, 10, 15, 20, 15, 12, 10, 8],
            k=1
        )[0]

    def _status_for_queue(self, count: int, is_open: bool):
        if not is_open:
            return "CLOSED"

        if count >= 6:
            return "OVERLOADED"

        if count >= 4:
            return "BUSY"

        return "OPEN"

    async def _emit_simulated_frame(self, db: AsyncSession):

        counter_states = await self._get_counter_states(db)

        self.counter_1_open = counter_states["queue-counter-1"]
        self.counter_2_open = counter_states["queue-counter-2"]
        self.counter_3_open = counter_states["queue-counter-3"]

        open_counter_count = sum([
            self.counter_1_open,
            self.counter_2_open,
            self.counter_3_open,
        ])

        if open_counter_count >= 3:
            max_increase = 2
        elif open_counter_count == 2:
            max_increase = 3
        elif open_counter_count == 1:
            max_increase = 4
        else:
            max_increase = 0

        alert_stmt = (
            select(AlertLog)
            .where(
                AlertLog.source_id == "shelf-aisle-3",
                AlertLog.is_acknowledged == False
            )
        )

        alert_res = await db.execute(alert_stmt)
        has_pending_alert = alert_res.scalars().first() is not None

        self.active_shoppers = max(
            20,
            min(
                50,
                self.active_shoppers + random.randint(-2, 2)
            )
        )

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
            avg_dwell_time_sec=round(
                random.uniform(160.0, 200.0),
                1
            ),
            spatial_coords=coords
        )

        db.add(telemetry)

        if self.counter_1_open:
            if max_increase > 0:
                self.queue_1_count = max(
                    0,
                    min(
                        10,
                        self.queue_1_count + self._queue_change(max_increase)
                    )
                )
        else:
            self.queue_1_count = 0

        if self.counter_2_open:
            if max_increase > 0:
                self.queue_2_count = max(
                    0,
                    min(
                        10,
                        self.queue_2_count + self._queue_change(max_increase)
                    )
                )
        else:
            self.queue_2_count = 0

        if self.counter_3_open:
            if max_increase > 0:
                self.queue_3_count = max(
                    0,
                    min(
                        10,
                        self.queue_3_count + self._queue_change(max_increase)
                    )
                )
        else:
            self.queue_3_count = 0

        q1_status = self._status_for_queue(
            self.queue_1_count,
            self.counter_1_open
        )

        q2_status = self._status_for_queue(
            self.queue_2_count,
            self.counter_2_open
        )

        q3_status = self._status_for_queue(
            self.queue_3_count,
            self.counter_3_open
        )

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

        if self.counter_1_open:
            await AlertEngine.evaluate_queue_telemetry(
                db,
                q1_payload
            )

        q2_payload = QueueMetricPayload(
            camera_id="cam-03-checkout-2",
            queue_id="queue-counter-2",
            queue_name="Cashier Counter 2",
            shopper_count=self.queue_2_count,
            estimated_wait_sec=self.queue_2_count * 110.0,
            cashier_status=q2_status
        )

        q2_metric = QueueMetric(
            camera_id=q2_payload.camera_id,
            queue_id=q2_payload.queue_id,
            queue_name=q2_payload.queue_name,
            shopper_count=q2_payload.shopper_count,
            estimated_wait_sec=q2_payload.estimated_wait_sec,
            cashier_status=q2_payload.cashier_status
        )

        db.add(q2_metric)

        if self.counter_2_open:
            await AlertEngine.evaluate_queue_telemetry(
                db,
                q2_payload
            )

        q3_payload = QueueMetricPayload(
            camera_id="cam-04-checkout-3",
            queue_id="queue-counter-3",
            queue_name="Cashier Counter 3",
            shopper_count=self.queue_3_count,
            estimated_wait_sec=self.queue_3_count * 110.0,
            cashier_status=q3_status
        )

        q3_metric = QueueMetric(
            camera_id=q3_payload.camera_id,
            queue_id=q3_payload.queue_id,
            queue_name=q3_payload.queue_name,
            shopper_count=q3_payload.shopper_count,
            estimated_wait_sec=q3_payload.estimated_wait_sec,
            cashier_status=q3_payload.cashier_status
        )

        db.add(q3_metric)

        if self.counter_3_open:
            await AlertEngine.evaluate_queue_telemetry(
                db,
                q3_payload
            )

        shelf_change = random.choices(
            [
                random.uniform(-20.0, -12.0),
                random.uniform(-12.0, -6.0),
                random.uniform(-6.0, 6.0),
                random.uniform(6.0, 12.0),
                random.uniform(12.0, 20.0)
            ],
            weights=[10, 20, 40, 20, 10]
        )[0]

        self.aisle_3_stock = max(
            5.0,
            min(
                100.0,
                self.aisle_3_stock + shelf_change
            )
        )

        shelf_payload = ShelfMetricPayload(
            aisle_name="Aisle 3",
            category="Dairy & Milk",
            fill_percentage=round(
                self.aisle_3_stock,
                1
            ),
            product_count=max(
                2,
                int(
                    (self.aisle_3_stock / 100.0) * 40
                )
            )
        )

        shelf_metric = ShelfMetric(
            aisle_name=shelf_payload.aisle_name,
            category=shelf_payload.category,
            fill_percentage=shelf_payload.fill_percentage,
            is_out_of_stock=shelf_payload.fill_percentage <= 20.0,
            product_count=shelf_payload.product_count
        )

        db.add(shelf_metric)

        await AlertEngine.evaluate_shelf_telemetry(
            db,
            shelf_payload
        )

        hw_payload = EdgeHardwareTelemetryPayload(
            device_id="Qualcomm-Snapdragon-RB5-01",
            fps=round(
                random.uniform(29.4, 30.0),
                1
            ),
            npu_load_pct=round(
                random.uniform(42.0, 52.0),
                1
            ),
            memory_usage_mb=round(
                random.uniform(490.0, 515.0),
                1
            ),
            inference_latency_ms=round(
                random.uniform(11.8, 12.8),
                1
            ),
            bandwidth_saved_mb=round(
                random.uniform(380.0, 440.0),
                1
            )
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

        await ws_manager.broadcast({
            "event": "TELEMETRY_UPDATE",
            "data": {
                "active_shoppers": self.active_shoppers,
                "queue_1_count": self.queue_1_count,
                "queue_2_count": self.queue_2_count,
                "queue_3_count": self.queue_3_count,
                "counter_1_open": self.counter_1_open,
                "counter_2_open": self.counter_2_open,
                "counter_3_open": self.counter_3_open,
                "open_counter_count": open_counter_count,
                "aisle_3_stock_pct": shelf_payload.fill_percentage,
                "npu_load_pct": hw_payload.npu_load_pct,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })


edge_simulator = EdgeSimulator()
