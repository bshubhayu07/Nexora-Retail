import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass, field
import time


@dataclass
class Track:
    """Represents a single anonymously tracked person."""
    track_id: int
    box: Tuple[float, float, float, float]  # [x1, y1, x2, y2]
    confidence: float
    age: int = 1
    hits: int = 1
    time_since_update: int = 0
    history: List[Tuple[float, float]] = field(default_factory=list)  # [(cx, cy), ...]
    start_time: float = field(default_factory=time.time)
    last_update_time: float = field(default_factory=time.time)

    @property
    def center(self) -> Tuple[float, float]:
        x1, y1, x2, y2 = self.box
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    @property
    def label(self) -> str:
        return f"Person {self.track_id}"


class KalmanBoxTracker:
    """Kalman filter for tracking bounding boxes in image space."""
    count = 0

    def __init__(self, bbox: Tuple[float, float, float, float], conf: float = 1.0):
        # State: [cx, cy, s, r, v_cx, v_cy, v_s] (s = scale/area, r = aspect ratio)
        self.track_id = KalmanBoxTracker.count + 1
        KalmanBoxTracker.count += 1

        self.box = bbox
        self.conf = conf
        self.hits = 1
        self.age = 1
        self.time_since_update = 0
        self.history: List[Tuple[float, float]] = []

        x1, y1, x2, y2 = bbox
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        cx, cy = x1 + w / 2.0, y1 + h / 2.0
        s = w * h
        r = w / float(h)

        self.history.append((cx, cy))
        self.start_time = time.time()
        self.last_update_time = time.time()

        # Simple linear motion model
        self.state = np.array([cx, cy, s, r, 0.0, 0.0, 0.0], dtype=np.float32)

    def predict(self) -> Tuple[float, float, float, float]:
        """Advances state vector and returns predicted bounding box."""
        # Update position by velocity
        self.state[0] += self.state[4]  # cx
        self.state[1] += self.state[5]  # cy
        self.state[2] += self.state[6]  # s

        self.age += 1
        if self.time_since_update > 0:
            self.hits = 0
        self.time_since_update += 1
        self.box = self._state_to_bbox(self.state)
        return self.box

    def update(self, bbox: Tuple[float, float, float, float], conf: float = 1.0):
        """Updates tracker state with observed bbox."""
        self.time_since_update = 0
        self.hits += 1
        self.conf = conf
        self.last_update_time = time.time()

        x1, y1, x2, y2 = bbox
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        cx, cy = x1 + w / 2.0, y1 + h / 2.0
        s = w * h
        r = w / float(h)

        # Smooth update
        alpha = 0.7
        self.state[4] = alpha * (cx - self.state[0]) + (1 - alpha) * self.state[4]
        self.state[5] = alpha * (cy - self.state[1]) + (1 - alpha) * self.state[5]
        self.state[6] = alpha * (s - self.state[2]) + (1 - alpha) * self.state[6]

        self.state[0] = cx
        self.state[1] = cy
        self.state[2] = s
        self.state[3] = r

        self.box = bbox
        self.history.append((cx, cy))
        if len(self.history) > 60:
            self.history.pop(0)

    def _state_to_bbox(self, state: np.ndarray) -> Tuple[float, float, float, float]:
        cx, cy, s, r = state[0], state[1], max(1.0, state[2]), max(0.1, state[3])
        w = np.sqrt(s * r)
        h = s / max(1.0, w)
        return (float(cx - w / 2.0), float(cy - h / 2.0), float(cx + w / 2.0), float(cy + h / 2.0))

    def to_track(self) -> Track:
        return Track(
            track_id=self.track_id,
            box=self.box,
            confidence=self.conf,
            age=self.age,
            hits=self.hits,
            time_since_update=self.time_since_update,
            history=list(self.history),
            start_time=self.start_time,
            last_update_time=self.last_update_time
        )


def calculate_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """Computes Intersection over Union (IoU) between two bounding boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])

    union_area = area1 + area2 - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area


class AnonymousTracker:
    """Pure-Python Edge-Optimized Multi-Object Tracker (Zero PII / 100% Anonymous)."""

    def __init__(self, max_age: int = 30, min_hits: int = 2, iou_threshold: float = 0.3):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.trackers: List[KalmanBoxTracker] = []

    def update(self, detections: List[Tuple[float, float, float, float]], confidences: Optional[List[float]] = None) -> List[Track]:
        """Updates active tracks with newly observed detections.

        Args:
            detections: List of [x1, y1, x2, y2]
            confidences: List of float confidences (optional)

        Returns:
            List of confirmed Track objects
        """
        if confidences is None:
            confidences = [1.0] * len(detections)

        # 1. Predict new locations of existing trackers
        for trk in self.trackers:
            trk.predict()

        num_trackers = len(self.trackers)
        num_dets = len(detections)

        # 2. Compute IoU cost matrix
        iou_matrix = np.zeros((num_trackers, num_dets), dtype=np.float32)
        for t_idx, trk in enumerate(self.trackers):
            for d_idx, det in enumerate(detections):
                iou_matrix[t_idx, d_idx] = calculate_iou(trk.box, det)

        # 3. Hungarian / Greedy Matching
        matched_trackers = set()
        matched_detections = set()
        matches = []

        if num_trackers > 0 and num_dets > 0:
            # Greedy matching for high throughput on laptop CPU
            flat_indices = np.argsort(-iou_matrix, axis=None)
            for flat_idx in flat_indices:
                t_idx, d_idx = np.unravel_index(flat_idx, iou_matrix.shape)
                if t_idx in matched_trackers or d_idx in matched_detections:
                    continue
                if iou_matrix[t_idx, d_idx] >= self.iou_threshold:
                    matched_trackers.add(t_idx)
                    matched_detections.add(d_idx)
                    matches.append((t_idx, d_idx))

        # 4. Update matched trackers
        for t_idx, d_idx in matches:
            self.trackers[t_idx].update(detections[d_idx], confidences[d_idx])

        # 5. Create new trackers for unmatched detections
        for d_idx in range(num_dets):
            if d_idx not in matched_detections:
                self.trackers.append(KalmanBoxTracker(detections[d_idx], confidences[d_idx]))

        # 6. Filter dead trackers and collect active tracks
        active_tracks = []
        surviving_trackers = []
        for trk in self.trackers:
            if trk.time_since_update < self.max_age:
                surviving_trackers.append(trk)
                if trk.hits >= self.min_hits or trk.age <= 2:
                    active_tracks.append(trk.to_track())

        self.trackers = surviving_trackers
        return active_tracks
