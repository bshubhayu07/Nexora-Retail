import time
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass, field
from ..tracking.tracker import Track
from .dwell_time import point_in_polygon


@dataclass
class QueueZoneMetrics:
    queue_id: str
    queue_name: str
    camera_id: str
    shopper_count: int
    estimated_wait_sec: float
    status: str  # NORMAL, WARNING, CRITICAL
    active_track_ids: List[int]
    timestamp: float = field(default_factory=time.time)


class QueueDetector:
    """Detects and monitors checkout queues in configurable polygon zones."""

    def __init__(
        self,
        queue_id: str = "queue-counter-1",
        queue_name: str = "Cashier Counter 1",
        camera_id: str = "cam-02-checkout-1",
        polygon: Optional[List[Tuple[float, float]]] = None,
        warning_threshold: int = 4,
        critical_threshold: int = 7,
        seconds_per_shopper: float = 115.0
    ):
        self.queue_id = queue_id
        self.queue_name = queue_name
        self.camera_id = camera_id
        # Default polygon (normalized 0..1 bounding checkout counter region)
        self.polygon = polygon or [(0.3, 0.3), (0.95, 0.3), (0.95, 0.95), (0.3, 0.95)]
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.seconds_per_shopper = seconds_per_shopper

    def evaluate_status(self, count: int) -> str:
        if count >= self.critical_threshold:
            return "CRITICAL"
        elif count >= self.warning_threshold:
            return "WARNING"
        return "NORMAL"

    def update(self, tracks: List[Track], frame_w: int = 1, frame_h: int = 1) -> QueueZoneMetrics:
        # Scale polygon if normalized
        is_normalized = all(0.0 <= p[0] <= 1.0 and 0.0 <= p[1] <= 1.0 for p in self.polygon)
        poly_px = [(p[0] * frame_w, p[1] * frame_h) for p in self.polygon] if is_normalized else self.polygon

        queued_track_ids: List[int] = []

        for track in tracks:
            # Use base center of bounding box (feet position) for precise floor occupancy
            x1, y1, x2, y2 = track.box
            feet_pt = ((x1 + x2) / 2.0, y2)
            center_pt = track.center

            if point_in_polygon(feet_pt, poly_px) or point_in_polygon(center_pt, poly_px):
                queued_track_ids.append(track.track_id)

        count = len(queued_track_ids)
        est_wait = count * self.seconds_per_shopper
        status = self.evaluate_status(count)

        return QueueZoneMetrics(
            queue_id=self.queue_id,
            queue_name=self.queue_name,
            camera_id=self.camera_id,
            shopper_count=count,
            estimated_wait_sec=round(est_wait, 1),
            status=status,
            active_track_ids=queued_track_ids,
            timestamp=time.time()
        )
