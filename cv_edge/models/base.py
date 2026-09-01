from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Tuple, Optional
import numpy as np


@dataclass
class Detection:
    """Represents a single bounding box detection."""
    box: Tuple[float, float, float, float]  # [x1, y1, x2, y2] in pixel coordinates
    confidence: float
    class_id: int
    class_name: str


class BaseDetector(ABC):
    """Abstract Base Class for Edge Computer Vision Detectors."""

    @abstractmethod
    def detect(self, frame: np.ndarray) -> List[Detection]:
        """Perform object detection on an input BGR image frame.

        Args:
            frame: np.ndarray image in BGR format (OpenCV format)

        Returns:
            List of Detection objects
        """
        pass

    @abstractmethod
    def get_device_info(self) -> dict:
        """Returns runtime provider and hardware device metadata."""
        pass
