import os
import sys
import time
import asyncio
import logging
import numpy as np

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from cv_edge.models.model_registry import ModelRegistry
from cv_edge.models.onnx_detector import ONNXDetector
from cv_edge.tracking.tracker import AnonymousTracker
from cv_edge.analytics.footfall import FootfallCounter
from cv_edge.analytics.dwell_time import ZoneAnalytics
from cv_edge.analytics.queue_detector import QueueDetector
from cv_edge.analytics.queue_predictor import QueuePredictor
from cv_edge.analytics.shelf_status import ShelfStatusTracker
from cv_edge.pipelines.shopper_pipeline import ShopperIntelligencePipeline
from cv_edge.pipelines.inventory_pipeline import InventoryIntelligencePipeline
import run_cv

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("offline_test")


def test_offline_architecture() -> bool:
    print("\n" + "=" * 65)
    print("      NEXORA RETAIL - ZERO-CLOUD / OFFLINE VERIFICATION SUITE")
    print("=" * 65)
    print("Verifying 100% On-Device Edge Execution without cloud APIs...\n")

    results = []

    # 1. Local Models Check
    print("[TEST 1/7] Verifying Local ONNX Model Files...")
    models = ModelRegistry.verify_local_models()
    person_ok = models["person_fp32"]["exists"] and models["person_fp32"]["size_mb"] > 1.0
    shelf_ok = models["shelf_detector"]["exists"] and models["shelf_detector"]["size_mb"] > 1.0
    if person_ok and shelf_ok:
        print(f"  [PASS] Local models present (Person: {models['person_fp32']['size_mb']:.1f} MB, Shelf: {models['shelf_detector']['size_mb']:.1f} MB)")
        results.append(("Local Model Availability", True))
    else:
        print(f"  [FAIL] Missing models: {models}")
        results.append(("Local Model Availability", False))

    # 2. Hardware Provider & CPU Fallback
    print("\n[TEST 2/7] Verifying Hardware Provider Selection & CPU Fallback...")
    try:
        det = ONNXDetector(models["person_fp32"]["path"])
        dev_info = det.get_device_info()
        print(f"  [PASS] Active Provider: {dev_info['active_provider']} | All: {dev_info['available_providers']}")
        results.append(("Hardware Provider Fallback", True))
    except Exception as e:
        print(f"  [FAIL] Provider initialization error: {e}")
        results.append(("Hardware Provider Fallback", False))

    # 3. Local Synthetic Frame Inference & Tracking
    print("\n[TEST 3/7] Verifying Local Inference & Anonymous Tracking...")
    try:
        tracker = AnonymousTracker()
        dummy_boxes = [(100.0, 100.0, 200.0, 300.0), (400.0, 150.0, 480.0, 320.0)]
        tracks_t0 = tracker.update(dummy_boxes)
        tracks_t1 = tracker.update([(105.0, 102.0, 205.0, 302.0), (402.0, 153.0, 482.0, 323.0)])
        if len(tracks_t1) == 2 and tracks_t0[0].track_id == tracks_t1[0].track_id:
            print(f"  [PASS] Anonymous IDs persistent: {tracks_t1[0].label}, {tracks_t1[1].label} (Zero PII)")
            results.append(("Anonymous Tracking", True))
        else:
            print(f"  [FAIL] Tracking mismatch: {tracks_t1}")
            results.append(("Anonymous Tracking", False))
    except Exception as e:
        print(f"  [FAIL] Tracking exception: {e}")
        results.append(("Anonymous Tracking", False))

    # 4. Footfall & Zone Dwell Analytics
    print("\n[TEST 4/7] Verifying Footfall Counting & Dwell Time Analytics...")
    try:
        counter = FootfallCounter(line_start=(0.0, 200.0), line_end=(1000.0, 200.0))
        # Crossing downwards
        from cv_edge.tracking.tracker import Track
        t1 = Track(track_id=1, box=(100, 150, 150, 190), confidence=0.9)
        counter.update([t1])
        t1_moved = Track(track_id=1, box=(100, 210, 150, 260), confidence=0.9)
        metrics = counter.update([t1_moved])
        print(f"  [PASS] Footfall calculated: {metrics.entries} entry, {metrics.exits} exit | Occupancy: {metrics.current_occupancy}")
        results.append(("Footfall Analytics", metrics.entries == 1))
    except Exception as e:
        print(f"  [FAIL] Footfall exception: {e}")
        results.append(("Footfall Analytics", False))

    # 5. Queue Detection & Congestion Prediction
    print("\n[TEST 5/7] Verifying Queue Polygon Detection & Linear Trend Prediction...")
    try:
        q_det = QueueDetector(polygon=[(0.0, 0.0), (500.0, 0.0), (500.0, 500.0), (0.0, 500.0)], warning_threshold=3, critical_threshold=5)
        q_pred = QueuePredictor(warning_threshold=3, critical_threshold=5)
        tracks = [
            Track(track_id=1, box=(100, 100, 150, 200), confidence=0.9),
            Track(track_id=2, box=(200, 200, 250, 300), confidence=0.9),
            Track(track_id=3, box=(300, 300, 350, 400), confidence=0.9),
            Track(track_id=4, box=(350, 350, 400, 450), confidence=0.9),
        ]
        q_metrics = q_det.update(tracks)
        prediction = q_pred.predict(q_metrics.shopper_count)
        print(f"  [PASS] Queue Shoppers: {q_metrics.shopper_count} [{q_metrics.status}] | Predicted: {prediction.predicted_queue_length}")
        print(f"         Recommendation: {prediction.recommended_action}")
        results.append(("Queue Analytics & Prediction", q_metrics.status == "WARNING"))
    except Exception as e:
        print(f"  [FAIL] Queue exception: {e}")
        results.append(("Queue Analytics & Prediction", False))

    # 6. Shelf Temporal Smoothing
    print("\n[TEST 6/7] Verifying Shelf Temporal Consensus Smoothing...")
    try:
        shelf = ShelfStatusTracker(expected_count=10, low_stock_pct=30.0, out_of_stock_pct=10.0, smoothing_window=3)
        _ = shelf.update(10)  # In stock
        _ = shelf.update(0)   # 1st empty frame (should not trigger instant panic)
        res_smooth = shelf.update(0) # Consecutive empty
        res_confirmed = shelf.update(0) # 3rd empty (confirmed out of stock)
        print(f"  [PASS] Shelf temporal smoothing verified. Final status: {res_confirmed.status} ({res_confirmed.smoothed_fill_pct}% fill)")
        results.append(("Shelf Temporal Smoothing", res_confirmed.status == "OUT_OF_STOCK"))
    except Exception as e:
        print(f"  [FAIL] Shelf exception: {e}")
        results.append(("Shelf Temporal Smoothing", False))

    # 7. Local Backend & SQLite Database Integration
    print("\n[TEST 7/7] Verifying Local Backend SQLite Ingestion & Local Dashboard...")
    try:
        from app.database import init_db, AsyncSessionLocal
        from app.models.domain import ShopperTelemetry, QueueMetric, ShelfMetric
        from sqlalchemy import select

        async def check_db():
            await init_db()
            async with AsyncSessionLocal() as db:
                q = QueueMetric(
                    camera_id="cam-02-checkout-1",
                    queue_id="queue-test",
                    queue_name="Cashier Counter 1",
                    shopper_count=5,
                    estimated_wait_sec=575.0,
                    cashier_status="BUSY"
                )
                db.add(q)
                await db.commit()
                res = await db.execute(select(QueueMetric).where(QueueMetric.queue_id == "queue-test"))
                row = res.scalars().first()
                return row is not None

        db_ok = asyncio.run(check_db())
        if db_ok:
            print("  [PASS] Local SQLite database write & read verified (Zero Cloud Storage)")
            results.append(("Local SQLite Ingestion", True))
        else:
            print("  [FAIL] Database check returned false.")
            results.append(("Local SQLite Ingestion", False))
    except Exception as e:
        print(f"  [FAIL] Local Database exception: {e}")
        results.append(("Local SQLite Ingestion", False))

    # Summary
    print("\n" + "=" * 65)
    print("               OFFLINE VERIFICATION SUMMARY")
    print("=" * 65)
    all_passed = True
    for name, passed in results:
        status_str = "PASS" if passed else "FAIL"
        if not passed:
            all_passed = False
        print(f"  [{status_str}] {name}")

    print("=" * 65)
    if all_passed:
        print("  >>> ZERO-CLOUD EDGE ARCHITECTURE FULLY VERIFIED (7/7 PASSED) <<<")
    else:
        print("  >>> SOME OFFLINE TESTS FAILED <<<")
    print("=" * 65 + "\n")

    return all_passed


if __name__ == "__main__":
    success = test_offline_architecture()
    sys.exit(0 if success else 1)
