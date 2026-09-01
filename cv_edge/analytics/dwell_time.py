import time
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass, field
from ..tracking.tracker import Track


@dataclass
class ZoneMetrics:
    zone_id: str
    zone_name: str
    current_people: int
    total_visits: int
    average_dwell_time_sec: float
    max_dwell_time_sec: float
    active_track_ids: List[int] = field(default_factory=list)


def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """Ray casting algorithm to test if a point (x, y) is inside a polygon."""
    x, y = point
    n = len(polygon)
    inside = False

    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


class ZoneAnalytics:
    """Calculates shopper dwell times and section popularity across configured polygon/rectangular zones."""

    def __init__(self, zone_id: str, zone_name: str, polygon: List[Tuple[float, float]]):
        """
        Args:
            zone_id: Identifier (e.g., "promo_aisle_1")
            zone_name: Display name (e.g., "Promotional Display")
            polygon: List of (x, y) polygon vertices (normalized 0..1 or pixel space)
        """
        self.zone_id = zone_id
        self.zone_name = zone_name
        self.polygon = polygon

        self.entry_times: Dict[int, float] = {}  # track_id -> entry_timestamp
        self.completed_dwells: List[float] = []
        self.total_visits = 0

    def update(self, tracks: List[Track], frame_w: int = 1, frame_h: int = 1) -> ZoneMetrics:
        now = time.time()

        # Scale polygon if defined in normalized coordinates
        is_normalized = all(0.0 <= p[0] <= 1.0 and 0.0 <= p[1] <= 1.0 for p in self.polygon)
        poly_px = [(p[0] * frame_w, p[1] * frame_h) for p in self.polygon] if is_normalized else self.polygon

        currently_inside: List[int] = []

        for track in tracks:
            tid = track.track_id
            center = track.center

            inside = point_in_polygon(center, poly_px)

            if inside:
                currently_inside.append(tid)
                if tid not in self.entry_times:
                    self.entry_times[tid] = now
                    self.total_visits += 1

        # Check for tracks that have exited the zone
        exited_tracks = [tid for tid in list(self.entry_times.keys()) if tid not in currently_inside]
        for tid in exited_tracks:
            entry_t = self.entry_times.pop(tid)
            dwell = now - entry_t
            if dwell >= 1.0:  # Minimum 1 second dwell to filter fast walk-bys
                self.completed_dwells.append(dwell)

        # Compute average dwell time (including active tracks)
        all_dwells = list(self.completed_dwells)
        for tid, entry_t in self.entry_times.items():
            all_dwells.append(now - entry_t)

        avg_dwell = (sum(all_dwells) / len(all_dwells)) if all_dwells else 0.0
        max_dwell = max(all_dwells) if all_dwells else 0.0

        return ZoneMetrics(
            zone_id=self.zone_id,
            zone_name=self.zone_name,
            current_people=len(currently_inside),
            total_visits=self.total_visits,
            average_dwell_time_sec=round(avg_dwell, 1),
            max_dwell_time_sec=round(max_dwell, 1),
            active_track_ids=currently_inside
        )

    def reset(self):
        self.entry_times.clear()
        self.completed_dwells.clear()
        self.total_visits = 0
