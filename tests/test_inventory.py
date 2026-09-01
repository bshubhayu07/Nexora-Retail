import pytest
import numpy as np
from cv_edge.analytics.shelf_status import ShelfStatusTracker
from cv_edge.pipelines.inventory_pipeline import InventoryIntelligencePipeline


def test_shelf_tracker_in_stock():
    tracker = ShelfStatusTracker(expected_count=10, low_stock_pct=30.0, out_of_stock_pct=10.0)
    res = tracker.update(detected_product_count=9)
    assert res.status == "IN_STOCK"
    assert res.fill_percentage == 90.0
    assert res.is_alert_triggered is False


def test_shelf_tracker_low_stock():
    tracker = ShelfStatusTracker(expected_count=10, low_stock_pct=30.0, out_of_stock_pct=10.0, smoothing_window=1)
    res = tracker.update(detected_product_count=2)  # 20%
    assert res.status == "LOW_STOCK"
    assert res.is_alert_triggered is True


def test_shelf_tracker_temporal_smoothing():
    tracker = ShelfStatusTracker(
        expected_count=10,
        low_stock_pct=30.0,
        out_of_stock_pct=10.0,
        smoothing_window=4,
        consecutive_empty_required=3
    )

    # Initially well stocked
    r1 = tracker.update(10)
    assert r1.status == "IN_STOCK"

    # Frame 2: temporary occluded frame (0 detected)
    r2 = tracker.update(0)
    # Temporal smoothing should hold the fill rate above 0
    assert r2.smoothed_fill_pct > 10.0

    # Frame 3: 0 detected
    r3 = tracker.update(0)

    # Frame 4: 3rd consecutive 0 -> confirmed out of stock
    r4 = tracker.update(0)
    assert r4.status == "OUT_OF_STOCK"
    assert r4.is_alert_triggered is True


def test_inventory_pipeline_processing():
    pipeline = InventoryIntelligencePipeline(mode="generic")
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    out = pipeline.process_frame(dummy_frame, annotate=True)
    assert len(out.results) == 2
    assert out.fps > 0
    assert out.annotated_frame is not None
