import logging
import time
from typing import Dict, Any, List, Optional
import requests

logger = logging.getLogger("backend_client")


class BackendIntegrationClient:
    """Dispatches real-time Edge Computer Vision telemetry events to the local FastAPI backend.

    Guarantees non-blocking resilience: if the backend is starting up or temporarily offline,
    the CV inference loop continues uninterrupted.
    """

    def __init__(self, base_url: str = "http://127.0.0.1:8000", timeout: float = 1.2):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.telemetry_endpoint = f"{self.base_url}/api/v1/edge/telemetry"
        self.queue_endpoint = f"{self.base_url}/api/v1/edge/queue"
        self.shelf_endpoint = f"{self.base_url}/api/v1/edge/shelf"
        self.hardware_endpoint = f"{self.base_url}/api/v1/edge/hardware"
        self.frame_endpoint = f"{self.base_url}/api/v1/edge/frame"

    def _post_event(self, endpoint: str, payload: Dict[str, Any], event_name: str) -> bool:
        try:
            resp = self.session.post(endpoint, json=payload, timeout=self.timeout)
            if resp.status_code in (200, 201):
                logger.debug(f"[SUCCESS] {event_name} sent: {resp.status_code}")
                return True
            else:
                logger.warning(f"[WARN] {event_name} backend returned {resp.status_code}: {resp.text}")
                return False
        except requests.exceptions.RequestException as e:
            logger.debug(f"[OFFLINE] Backend unreachable for {event_name} ({e}). Processing locally.")
            return False

    def send_shopper_telemetry(
        self,
        camera_id: str,
        shopper_count: int,
        avg_dwell_time_sec: float,
        entries: Optional[int] = None,
        exits: Optional[int] = None,
        spatial_coords: Optional[List[Dict[str, float]]] = None
    ) -> bool:
        payload = {
            "camera_id": camera_id,
            "shopper_count": shopper_count,
            "avg_dwell_time_sec": round(avg_dwell_time_sec, 1),
            "entries": entries,
            "exits": exits,
            "spatial_coords": spatial_coords or []
        }
        return self._post_event(self.telemetry_endpoint, payload, "ShopperTelemetry")

    def send_queue_metric(
        self,
        camera_id: str,
        queue_id: str,
        queue_name: str,
        shopper_count: int,
        estimated_wait_sec: Optional[float] = None,
        cashier_status: str = "OPEN"
    ) -> bool:
        payload = {
            "camera_id": camera_id,
            "queue_id": queue_id,
            "queue_name": queue_name,
            "shopper_count": shopper_count,
            "estimated_wait_sec": estimated_wait_sec,
            "cashier_status": cashier_status
        }
        return self._post_event(self.queue_endpoint, payload, "QueueMetric")

    def send_shelf_metric(
        self,
        aisle_name: str,
        category: str,
        fill_percentage: float,
        product_count: int
    ) -> bool:
        payload = {
            "aisle_name": aisle_name,
            "category": category,
            "fill_percentage": round(fill_percentage, 1),
            "product_count": product_count
        }
        return self._post_event(self.shelf_endpoint, payload, "ShelfMetric")

    def send_hardware_telemetry(
        self,
        device_id: str,
        fps: float,
        npu_load_pct: float,
        memory_usage_mb: float,
        inference_latency_ms: float,
        bandwidth_saved_mb: float
    ) -> bool:
        payload = {
            "device_id": device_id,
            "fps": round(fps, 1),
            "npu_load_pct": round(npu_load_pct, 1),
            "memory_usage_mb": round(memory_usage_mb, 1),
            "inference_latency_ms": round(inference_latency_ms, 1),
            "bandwidth_saved_mb": round(bandwidth_saved_mb, 1)
        }
        return self._post_event(self.hardware_endpoint, payload, "HardwareTelemetry")

    def send_camera_frame(
        self,
        camera_id: str,
        image_base64: str,
        fps: float = 30.0,
        shopper_count: int = 0,
        status_label: str = "ACTIVE"
    ) -> bool:
        payload = {
            "camera_id": camera_id,
            "image_base64": image_base64,
            "fps": round(fps, 1),
            "shopper_count": shopper_count,
            "status_label": status_label
        }
        return self._post_event(self.frame_endpoint, payload, "CameraFrame")

