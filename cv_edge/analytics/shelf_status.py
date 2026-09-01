import time
from typing import List, Tuple, Dict, Optional, Deque
from collections import deque
from dataclasses import dataclass


@dataclass
class ShelfStatusResult:
    shelf_id: str
    aisle_name: str
    category: str
    detected_count: int
    expected_count: int
    fill_percentage: float
    status: str  # IN_STOCK, LOW_STOCK, OUT_OF_STOCK, UNKNOWN
    is_alert_triggered: bool
    confidence: float
    smoothed_fill_pct: float


class ShelfStatusTracker:
    """Evaluates shelf inventory levels with temporal smoothing to prevent false-alarm flickering."""

    def __init__(
        self,
        shelf_id: str = "shelf-aisle-3",
        aisle_name: str = "Aisle 3",
        category: str = "Dairy & Milk",
        expected_count: int = 10,
        low_stock_pct: float = 30.0,
        out_of_stock_pct: float = 15.0,
        smoothing_window: int = 5,
        consecutive_empty_required: int = 3
    ):
        self.shelf_id = shelf_id
        self.aisle_name = aisle_name
        self.category = category
        self.expected_count = max(1, expected_count)
        self.low_stock_pct = low_stock_pct
        self.out_of_stock_pct = out_of_stock_pct
        self.smoothing_window = smoothing_window
        self.consecutive_empty_required = consecutive_empty_required

        self.fill_history: Deque[float] = deque(maxlen=smoothing_window)
        self.count_history: Deque[int] = deque(maxlen=smoothing_window)
        self.consecutive_empty_count = 0
        self.current_status = "IN_STOCK"

    def update(self, detected_product_count: int, confidence: float = 0.9) -> ShelfStatusResult:
        raw_fill_pct = min(100.0, (detected_product_count / float(self.expected_count)) * 100.0)
        
        self.fill_history.append(raw_fill_pct)
        self.count_history.append(detected_product_count)

        # Compute rolling smoothed fill percentage
        smoothed_fill = sum(self.fill_history) / len(self.fill_history)
        smoothed_count = int(round(sum(self.count_history) / len(self.count_history)))

        # Temporal consensus for out-of-stock
        if detected_product_count == 0 or raw_fill_pct <= self.out_of_stock_pct:
            self.consecutive_empty_count += 1
        else:
            self.consecutive_empty_count = max(0, self.consecutive_empty_count - 1)

        # Determine stable status
        if self.consecutive_empty_count >= self.consecutive_empty_required or smoothed_fill <= self.out_of_stock_pct:
            status = "OUT_OF_STOCK"
            is_alert = True
        elif smoothed_fill <= self.low_stock_pct:
            status = "LOW_STOCK"
            is_alert = True
        else:
            status = "IN_STOCK"
            is_alert = False

        self.current_status = status

        return ShelfStatusResult(
            shelf_id=self.shelf_id,
            aisle_name=self.aisle_name,
            category=self.category,
            detected_count=smoothed_count,
            expected_count=self.expected_count,
            fill_percentage=round(raw_fill_pct, 1),
            status=status,
            is_alert_triggered=is_alert,
            confidence=confidence,
            smoothed_fill_pct=round(smoothed_fill, 1)
        )
