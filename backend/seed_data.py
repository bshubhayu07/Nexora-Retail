import asyncio
from datetime import datetime, timedelta
from app.database import AsyncSessionLocal, init_db
from app.models.domain import Camera, ShopperTelemetry, QueueMetric, ShelfMetric, AlertLog, EdgeHardwareTelemetry
import random

async def seed_database():
    print("Initializing Database tables...")
    await init_db()
    
    async with AsyncSessionLocal() as db:
        print("Seeding Cameras...")
        cameras = [
            Camera(id="cam-01-entrance", name="Store Entrance CCTV", location_zone="Entrance", edge_device_type="Qualcomm Snapdragon RB5"),
            Camera(id="cam-02-checkout-1", name="Checkout Counter 1 Camera", location_zone="Checkout Zone", edge_device_type="Qualcomm Snapdragon RB5"),
            Camera(id="cam-03-checkout-2", name="Checkout Counter 2 Camera", location_zone="Checkout Zone", edge_device_type="Qualcomm Snapdragon RB5"),
            Camera(id="cam-04-aisle-3", name="Aisle 3 Dairy Camera", location_zone="Aisle 3", edge_device_type="Qualcomm Snapdragon RB5"),
        ]
        for c in cameras:
            await db.merge(c)
            
        print("Seeding Shopper Telemetry & Spatial Heatmaps...")
        now = datetime.utcnow()
        for i in range(30):
            t_time = now - timedelta(minutes=i * 2)
            coords = [
                {"x": random.uniform(10, 35), "y": random.uniform(10, 40), "dwell_sec": random.uniform(5, 30)},
                {"x": random.uniform(65, 90), "y": random.uniform(70, 95), "dwell_sec": random.uniform(10, 60)},
                {"x": random.uniform(40, 60), "y": random.uniform(30, 60), "dwell_sec": random.uniform(2, 15)},
            ]
            tel = ShopperTelemetry(
                timestamp=t_time,
                camera_id="cam-01-entrance",
                shopper_count=random.randint(18, 42),
                avg_dwell_time_sec=random.uniform(120, 240),
                spatial_coords=coords
            )
            db.add(tel)
            
        print("Seeding Queues...")
        q1 = QueueMetric(
            camera_id="cam-02-checkout-1",
            queue_id="queue-counter-1",
            queue_name="Cashier Counter 1",
            shopper_count=6,
            estimated_wait_sec=690.0,
            cashier_status="OVERLOADED"
        )
        q2 = QueueMetric(
            camera_id="cam-03-checkout-2",
            queue_id="queue-counter-2",
            queue_name="Cashier Counter 2",
            shopper_count=2,
            estimated_wait_sec=210.0,
            cashier_status="OPEN"
        )
        db.add(q1)
        db.add(q2)
        
        print("Seeding Shelves...")
        shelves = [
            ShelfMetric(aisle_name="Aisle 1", category="Fresh Fruits & Vegetables", fill_percentage=88.0, is_out_of_stock=False, product_count=45),
            ShelfMetric(aisle_name="Aisle 2", category="Packaged Snacks & Chips", fill_percentage=65.0, is_out_of_stock=False, product_count=32),
            ShelfMetric(aisle_name="Aisle 3", category="Dairy & Milk Products", fill_percentage=14.5, is_out_of_stock=True, product_count=3),
            ShelfMetric(aisle_name="Aisle 4", category="Soft Drinks & Juices", fill_percentage=79.0, is_out_of_stock=False, product_count=38),
        ]
        for s in shelves:
            db.add(s)
            
        print("Seeding Alerts...")
        alerts = [
            AlertLog(
                alert_type="QUEUE_OVERFLOW",
                severity="CRITICAL",
                title="High Queue Congestion at Cashier Counter 1",
                message="Cashier Counter 1 has 6 shoppers in line. Estimated wait time exceeds 11 minutes. Open Counter 3 immediately.",
                source_id="queue-counter-1"
            ),
            AlertLog(
                alert_type="SHELF_EMPTY",
                severity="CRITICAL",
                title="Low Stock Alert: Aisle 3 (Dairy & Milk)",
                message="Aisle 3 Dairy shelf fill level has dropped to 14.5%. Only 3 items remaining. Immediate restock advised.",
                source_id="shelf-aisle-3"
            )
        ]
        for a in alerts:
            db.add(a)
            
        print("Seeding Qualcomm Hardware Telemetry...")
        hw = EdgeHardwareTelemetry(
            device_id="Qualcomm-Snapdragon-RB5-01",
            fps=29.8,
            npu_load_pct=48.2,
            memory_usage_mb=512.0,
            inference_latency_ms=12.1,
            bandwidth_saved_mb=420.5
        )
        db.add(hw)
        
        await db.commit()
        print("Database Seeding Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
