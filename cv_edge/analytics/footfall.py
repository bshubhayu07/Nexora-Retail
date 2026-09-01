import time
from typing import Tuple, List, Dict, Set
from dataclasses import dataclass
from ..tracking.tracker import Track


@dataclass
class FootfallMetrics:
    entries: int
    exits: int
    current_occupancy: int
    total_crossings: int


class FootfallCounter:
    """Calculates footfall entries and exits across configurable virtual counting lines.

    Features:
    - Precise directional vector math (cross product)
    - Anti-duplicate crossing debouncing per track ID
    - Robust occupancy calculation with zero-floor safeguards
    """

    def __init__(
        self,
        line_start: Tuple[float, float] = (0.1, 0.5),
        line_end: Tuple[float, float] = (0.9, 0.5),
        cooldown_sec: float = 2.0
    ):
        """
        Args:
            line_start: (x1, y1) as normalized (0..1) or pixel coordinates
            line_end: (x2, y2) as normalized (0..1) or pixel coordinates
            cooldown_sec: Debounce period to prevent double-counting
        """
        self.p1 = line_start
        self.p2 = line_end
        self.cooldown_sec = cooldown_sec

        self.entries = 0
        self.exits = 0
        self.last_cross_time: Dict[int, float] = {}  # track_id -> timestamp
        self.last_side: Dict[int, int] = {}  # track_id -> side (-1 or 1)

    def _get_side(self, pt: Tuple[float, float]) -> int:
        """Determines which side of the line vector (p1 -> p2) the point lies on using cross product.
        Returns:
            1 if left/above, -1 if right/below, 0 if collinear
        """
        x, y = pt
        x1, y1 = self.p1
        x2, y2 = self.p2

        cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
        if cross > 1e-4:
            return 1
        elif cross < -1e-4:
            return -1
        return 0

    def update(self, tracks: List[Track], frame_w: int = 1, frame_h: int = 1) -> FootfallMetrics:
        """Processes active tracks and updates entry/exit counts.

        Args:
            tracks: List of active Track objects
            frame_w: Current frame width (if line coordinates are normalized)
            frame_h: Current frame height (if line coordinates are normalized)
        """
        now = time.time()

        # Scale line to pixels if normalized
        is_normalized = (self.p1[0] <= 1.0 and self.p1[1] <= 1.0 and self.p2[0] <= 1.0 and self.p2[1] <= 1.0)
        p1_px = (self.p1[0] * frame_w, self.p1[1] * frame_h) if is_normalized else self.p1
        p2_px = (self.p2[0] * frame_w, self.p2[1] * frame_h) if is_normalized else self.p2

        # Temporarily use pixel coordinates for cross-product
        orig_p1, orig_p2 = self.p1, self.p2
        self.p1, self.p2 = p1_px, p2_px

        try:
            for track in tracks:
                tid = track.track_id
                center = track.center
                current_side = self._get_side(center)

                if tid not in self.last_side:
                    self.last_side[tid] = current_side
                    continue

                prev_side = self.last_side[tid]

                # Check if crossed the line
                if prev_side != 0 and current_side != 0 and prev_side != current_side:
                    # Check debouncing cooldown
                    last_time = self.last_cross_time.get(tid, 0)
                    if now - last_time >= self.cooldown_sec:
                        if prev_side == -1 and current_side == 1:
                            self.entries += 1
                            self.last_cross_time[tid] = now
                        elif prev_side == 1 and current_side == -1:
                            self.exits += 1
                            self.last_cross_time[tid] = now

                self.last_side[tid] = current_side

        finally:
            self.p1, self.p2 = orig_p1, orig_p2

        occupancy = max(0, self.entries - self.exits)
        return FootfallMetrics(
            entries=self.entries,
            exits=self.exits,
            current_occupancy=occupancy,
            total_crossings=self.entries + self.exits
        )

    def reset(self):
        self.entries = 0
        self.exits = 0
        self.last_cross_time.clear()
        self.last_side.clear()
