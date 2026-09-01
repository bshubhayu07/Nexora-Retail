import time
from typing import List, Tuple, Dict, Optional, Deque
from collections import deque
from dataclasses import dataclass


@dataclass
class QueuePrediction:
    current_queue_length: int
    current_status: str
    queue_growth_rate: float  # shoppers per minute
    predicted_queue_length: int
    predicted_status: str
    recommended_action: str


class QueuePredictor:
    """Explainable sliding-window linear trend predictor for checkout queue congestion."""

    def __init__(
        self,
        history_window_size: int = 20,
        forecast_horizon_intervals: int = 5,
        warning_threshold: int = 4,
        critical_threshold: int = 7
    ):
        self.history_window_size = history_window_size
        self.forecast_horizon_intervals = forecast_horizon_intervals
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold

        # Store (timestamp, queue_length)
        self.history: Deque[Tuple[float, int]] = deque(maxlen=history_window_size)

    def record(self, count: int, timestamp: Optional[float] = None):
        t = timestamp or time.time()
        self.history.append((t, count))

    def predict(self, current_count: int) -> QueuePrediction:
        self.record(current_count)

        if len(self.history) < 3:
            # Insufficient history for trend: forecast current count
            predicted_count = current_count
            growth_rate = 0.0
        else:
            # Linear trend estimation via least squares: y = slope * x + intercept
            times = [h[0] for h in self.history]
            counts = [h[1] for h in self.history]

            # Normalize times relative to first entry
            t0 = times[0]
            dt_total = times[-1] - t0
            if dt_total < 1e-3:
                # Timestamps are in sub-millisecond tight loop, use uniform index steps (e.g. 1 sec each)
                norm_times = [float(i) for i in range(len(times))]
                dt_total = float(len(times) - 1)
            else:
                norm_times = [t - t0 for t in times]

            n = len(norm_times)
            sum_x = sum(norm_times)
            sum_y = sum(counts)
            sum_xx = sum(x * x for x in norm_times)
            sum_xy = sum(x * y for x, y in zip(norm_times, counts))

            denominator = (n * sum_xx - sum_x * sum_x)
            if abs(denominator) > 1e-5:
                slope = (n * sum_xy - sum_x * sum_y) / denominator  # count change per unit time
            else:
                slope = 0.0

            growth_rate = slope * 60.0  # shoppers per minute

            # Predict ahead by horizon (assume average 2.5s interval between checks)
            future_dt = max(2.5, (dt_total / max(1, n - 1)) * self.forecast_horizon_intervals)
            predicted_raw = counts[-1] + (slope * future_dt)
            predicted_count = max(0, int(round(predicted_raw)))

        # Evaluate statuses
        curr_status = self._classify(current_count)
        pred_status = self._classify(predicted_count)

        # Generate rule-based actionable recommendation
        action = self._generate_recommendation(current_count, predicted_count, growth_rate)

        return QueuePrediction(
            current_queue_length=current_count,
            current_status=curr_status,
            queue_growth_rate=round(growth_rate, 2),
            predicted_queue_length=predicted_count,
            predicted_status=pred_status,
            recommended_action=action
        )

    def _classify(self, count: int) -> str:
        if count >= self.critical_threshold:
            return "CRITICAL"
        elif count >= self.warning_threshold:
            return "WARNING"
        return "NORMAL"

    def _generate_recommendation(self, current: int, predicted: int, growth_rate: float) -> str:
        if current >= self.critical_threshold or predicted >= self.critical_threshold:
            return "CRITICAL: Open additional checkout counter immediately."
        elif current >= self.warning_threshold or (predicted >= self.warning_threshold and growth_rate > 0.5):
            return "WARNING: Queue trend increasing. Prepare next cashier."
        elif growth_rate > 1.5:
            return "NOTICE: Rapid surge detected. Monitor checkout traffic."
        else:
            return "OPTIMAL: Queue flow is smooth and under capacity."
