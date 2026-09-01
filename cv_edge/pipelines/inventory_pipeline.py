import os
import time
import logging
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass
import numpy as np
import cv2
import onnxruntime as ort

from ..models.onnx_detector import ONNXDetector
from ..models.model_registry import ModelRegistry
from ..analytics.shelf_status import ShelfStatusTracker, ShelfStatusResult
from ..integration.backend_client import BackendIntegrationClient

logger = logging.getLogger("inventory_pipeline")


@dataclass
class ShelfPipelineOutput:
    results: List[ShelfStatusResult]
    fps: float
    latency_ms: float
    annotated_frame: Optional[np.ndarray] = None


class InventoryIntelligencePipeline:
    """Edge AI Pipeline for Shelf Monitoring, Out-of-Stock Detection, and Planogram Visibility."""

    def __init__(
        self,
        mode: str = "generic",  # "generic" or "custom_onnx"
        model_path: Optional[str] = None,
        aisle_name: str = "Aisle 3",
        category: str = "Dairy & Milk",
        expected_product_count: int = 8,
        backend_url: str = "http://127.0.0.1:8000",
        shelf_rois: Optional[List[Dict[str, Any]]] = None
    ):
        self.mode = mode
        self.aisle_name = aisle_name
        self.category = category
        self.backend = BackendIntegrationClient(base_url=backend_url)

        # Configurable Shelf ROIs (normalized coordinates matching 1280x720 frame layout)
        self.shelf_rois = shelf_rois or [
            {
                "shelf_id": "shelf-aisle-3-upper",
                "name": "Aisle 3 Upper Shelf",
                "aisle_name": "Aisle 3 (Upper Shelf)",
                "category": "Dairy & Milk",
                "roi": (0.41, 0.13, 0.64, 0.26),  # (x1, y1, x2, y2)
                "expected": 8,
                "tracker": ShelfStatusTracker(
                    shelf_id="shelf-aisle-3-upper",
                    aisle_name="Aisle 3 (Upper Shelf)",
                    category="Dairy & Milk",
                    expected_count=8
                )
            },
            {
                "shelf_id": "shelf-aisle-3-lower",
                "name": "Aisle 3 Lower Shelf",
                "aisle_name": "Aisle 3 (Lower Shelf)",
                "category": "Dairy & Milk",
                "roi": (0.41, 0.28, 0.64, 0.41),
                "expected": 10,
                "tracker": ShelfStatusTracker(
                    shelf_id="shelf-aisle-3-lower",
                    aisle_name="Aisle 3 (Lower Shelf)",
                    category="Dairy & Milk",
                    expected_count=10
                )
            }
        ]

        # Model initialization
        self.custom_session = None
        if self.mode == "custom_onnx":
            custom_path = model_path or ModelRegistry.get_shelf_model_path()
            if os.path.exists(custom_path):
                self.custom_session = ort.InferenceSession(custom_path, providers=["CPUExecutionProvider"])
                self.custom_input = self.custom_session.get_inputs()[0].name
                logger.info(f"Loaded custom ONNX shelf classifier: {custom_path}")

        # Generic detector for product classes (bottle, cup, bowl, banana, apple, etc.)
        self.generic_detector = None
        if self.mode == "generic":
            try:
                person_model = ModelRegistry.get_person_model_path()
                # Load with target classes for common retail items: bottle(39), wine glass(40), cup(41), bowl(45), apple(47)...
                self.generic_detector = ONNXDetector(
                    model_path=person_model,
                    confidence_threshold=0.25,
                    target_classes=[39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54]
                )
            except Exception as e:
                logger.warning(f"Could not load generic retail detector: {e}")

        self.prev_frame_time = time.time()
        self.last_backend_sync = 0.0
        self.sync_interval_sec = 2.0

    def process_frame(
        self,
        frame: np.ndarray,
        annotate: bool = True,
        simulated_counts: Optional[List[int]] = None
    ) -> ShelfPipelineOutput:
        start_t = time.time()
        frame_h, frame_w = frame.shape[:2]

        results: List[ShelfStatusResult] = []

        for idx, shelf_cfg in enumerate(self.shelf_rois):
            roi = shelf_cfg["roi"]
            rx1, ry1, rx2, ry2 = int(roi[0] * frame_w), int(roi[1] * frame_h), int(roi[2] * frame_w), int(roi[3] * frame_h)
            rx1, ry1 = max(0, rx1), max(0, ry1)
            rx2, ry2 = min(frame_w, rx2), min(frame_h, ry2)

            shelf_crop = frame[ry1:ry2, rx1:rx2]

            detected_count = 0
            conf = 0.88

            if simulated_counts is not None and idx < len(simulated_counts):
                detected_count = simulated_counts[idx]
            elif self.mode == "custom_onnx" and self.custom_session is not None and shelf_crop.size > 0:
                # Custom ONNX Classifier
                resized = cv2.resize(shelf_crop, (224, 224))
                rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
                mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
                std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
                norm = (rgb - mean) / std
                chw = np.transpose(norm, (2, 0, 1))
                blob = np.expand_dims(chw, axis=0)

                out = self.custom_session.run(None, {self.custom_input: blob})[0]
                pred_idx = int(np.argmax(out[0]))
                classes = ["empty", "low", "stocked"]
                pred_class = classes[pred_idx] if pred_idx < len(classes) else "low"

                if pred_class == "empty":
                    detected_count = 0
                elif pred_class == "low":
                    detected_count = max(1, int(shelf_cfg["expected"] * 0.25))
                else:
                    detected_count = int(shelf_cfg["expected"] * 0.85)

            elif self.generic_detector is not None and shelf_crop.size > 0:
                # Generic Object Detector on Crop
                dets = self.generic_detector.detect(shelf_crop)
                detected_count = len(dets)
                if detected_count == 0:
                    # Spatial edge/intensity variance fallback for generic retail product detection
                    gray = cv2.cvtColor(shelf_crop, cv2.COLOR_BGR2GRAY)
                    edges = cv2.Canny(gray, 50, 150)
                    edge_density = np.sum(edges > 0) / float(edges.size)
                    # Rough estimate based on visual texture
                    detected_count = int(np.clip(edge_density * 25.0, 0, shelf_cfg["expected"]))

            # Evaluate with temporal smoothing tracker
            status_res = shelf_cfg["tracker"].update(detected_count, confidence=conf)
            results.append(status_res)

        end_t = time.time()
        latency_ms = (end_t - start_t) * 1000.0
        dt = max(0.001, end_t - self.prev_frame_time)
        fps = 1.0 / dt
        self.prev_frame_time = end_t

        # Non-blocking backend dispatch
        now = time.time()
        if now - self.last_backend_sync >= self.sync_interval_sec:
            for shelf_cfg, res in zip(self.shelf_rois, results):
                self.backend.send_shelf_metric(
                    aisle_name=shelf_cfg.get("aisle_name", self.aisle_name),
                    category=shelf_cfg.get("category", self.category),
                    fill_percentage=res.smoothed_fill_pct,
                    product_count=res.detected_count
                )
            self.last_backend_sync = now

        annotated_frame = self._render_annotations(frame.copy(), results, fps, latency_ms) if annotate else None

        return ShelfPipelineOutput(
            results=results,
            fps=fps,
            latency_ms=latency_ms,
            annotated_frame=annotated_frame
        )

    def _render_annotations(self, frame, results, fps, latency):
        h, w = frame.shape[:2]

        # Top HUD Banner (only if standalone inventory pipeline)
        # Check if shopper banner already exists by inspecting top bar or keeping clean
        for idx, (shelf_cfg, res) in enumerate(zip(self.shelf_rois, results)):
            roi = shelf_cfg["roi"]
            rx1, ry1, rx2, ry2 = int(roi[0] * w), int(roi[1] * h), int(roi[2] * w), int(roi[3] * h)

            if res.status == "OUT_OF_STOCK":
                color = (0, 0, 255)  # Red
            elif res.status == "LOW_STOCK":
                color = (0, 165, 255)  # Orange
            else:
                color = (0, 255, 0)  # Green

            cv2.rectangle(frame, (rx1, ry1), (rx2, ry2), color, 2)
            lbl = f"{shelf_cfg['name']}: {res.status} ({res.smoothed_fill_pct:.0f}% fill | {res.detected_count}/{res.expected_count} items)"
            lbl_y = ry1 - 8 if idx == 0 else (ry2 + 16)
            cv2.putText(frame, lbl, (rx1, lbl_y), cv2.FONT_HERSHEY_SIMPLEX, 0.44, color, 1)

        return frame
