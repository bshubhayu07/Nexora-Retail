import time
import pytest
from cv_edge.tracking.tracker import AnonymousTracker, calculate_iou, Track
from cv_edge.analytics.footfall import FootfallCounter
from cv_edge.analytics.dwell_time import ZoneAnalytics, point_in_polygon
from cv_edge.analytics.queue_detector import QueueDetector
from cv_edge.analytics.queue_predictor import QueuePredictor


def test_iou_calculation():
    box1 = (0.0, 0.0, 10.0, 10.0)
    box2 = (0.0, 0.0, 10.0, 10.0)
    assert calculate_iou(box1, box2) == 1.0

    box3 = (20.0, 20.0, 30.0, 30.0)
    assert calculate_iou(box1, box3) == 0.0

    box4 = (5.0, 0.0, 15.0, 10.0)
    assert 0.3 < calculate_iou(box1, box4) < 0.4


def test_anonymous_tracker_id_persistence():
    tracker = AnonymousTracker(max_age=10, min_hits=1)
    
    # Frame 1
    boxes_1 = [(100.0, 100.0, 150.0, 200.0)]
    tracks_1 = tracker.update(boxes_1)
    assert len(tracks_1) == 1
    tid_1 = tracks_1[0].track_id
    assert tracks_1[0].label == f"Person {tid_1}"

    # Frame 2: slight movement
    boxes_2 = [(104.0, 102.0, 154.0, 202.0)]
    tracks_2 = tracker.update(boxes_2)
    assert len(tracks_2) == 1
    assert tracks_2[0].track_id == tid_1


def test_footfall_line_crossing():
    counter = FootfallCounter(line_start=(0.0, 100.0), line_end=(500.0, 100.0), cooldown_sec=0.1)

    # Person above line
    t1 = Track(track_id=1, box=(50.0, 40.0, 80.0, 80.0), confidence=0.9)
    m1 = counter.update([t1])
    assert m1.entries == 0
    assert m1.exits == 0

    # Person moves below line (Entry)
    t1_moved = Track(track_id=1, box=(50.0, 120.0, 80.0, 160.0), confidence=0.9)
    m2 = counter.update([t1_moved])
    assert m2.entries == 1
    assert m2.current_occupancy == 1

    time.sleep(0.15)  # Wait for cooldown

    # Person moves back above line (Exit)
    t1_back = Track(track_id=1, box=(50.0, 40.0, 80.0, 80.0), confidence=0.9)
    m3 = counter.update([t1_back])
    assert m3.exits == 1
    assert m3.current_occupancy == 0


def test_zone_point_in_polygon_and_dwell():
    poly = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0)]
    assert point_in_polygon((50.0, 50.0), poly) is True
    assert point_in_polygon((150.0, 50.0), poly) is False

    zone = ZoneAnalytics(zone_id="test-zone", zone_name="Test Zone", polygon=poly)
    t1 = Track(track_id=1, box=(20.0, 20.0, 60.0, 60.0), confidence=0.9)
    m = zone.update([t1])
    assert m.current_people == 1
    assert m.total_visits == 1


def test_queue_detection_and_thresholds():
    q_det = QueueDetector(
        warning_threshold=3,
        critical_threshold=6,
        polygon=[(0.0, 0.0), (200.0, 0.0), (200.0, 200.0), (0.0, 200.0)],
        seconds_per_shopper=60.0
    )

    # 2 people = NORMAL
    tracks_2 = [
        Track(track_id=1, box=(10.0, 10.0, 30.0, 50.0), confidence=0.9),
        Track(track_id=2, box=(60.0, 60.0, 80.0, 100.0), confidence=0.9)
    ]
    m_norm = q_det.update(tracks_2)
    assert m_norm.status == "NORMAL"
    assert m_norm.shopper_count == 2
    assert m_norm.estimated_wait_sec == 120.0

    # 4 people = WARNING
    tracks_4 = tracks_2 + [
        Track(track_id=3, box=(90.0, 90.0, 110.0, 130.0), confidence=0.9),
        Track(track_id=4, box=(120.0, 120.0, 140.0, 160.0), confidence=0.9)
    ]
    m_warn = q_det.update(tracks_4)
    assert m_warn.status == "WARNING"

    # 7 people = CRITICAL
    tracks_7 = tracks_4 + [
        Track(track_id=5, box=(140.0, 140.0, 150.0, 170.0), confidence=0.9),
        Track(track_id=6, box=(150.0, 150.0, 160.0, 180.0), confidence=0.9),
        Track(track_id=7, box=(160.0, 160.0, 170.0, 190.0), confidence=0.9)
    ]
    m_crit = q_det.update(tracks_7)
    assert m_crit.status == "CRITICAL"


def test_queue_prediction_trend():
    predictor = QueuePredictor(history_window_size=10, warning_threshold=4, critical_threshold=7)

    # Increasing trend: 2 -> 3 -> 4 -> 5
    now = time.time()
    for i, count in enumerate([2, 3, 4, 5]):
        pred = predictor.predict(count)

    assert pred.current_queue_length == 5
    assert pred.current_status == "WARNING"
    assert pred.queue_growth_rate > 0
    assert "Open additional checkout counter" in pred.recommended_action or "Prepare next cashier" in pred.recommended_action
