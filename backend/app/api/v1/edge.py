from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import ShopperTelemetryPayload, QueueMetricPayload, ShelfMetricPayload, EdgeHardwareTelemetryPayload
from app.models.domain import ShopperTelemetry, QueueMetric, ShelfMetric, EdgeHardwareTelemetry
from app.services.alert_engine import AlertEngine
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/edge", tags=["Edge Ingestion"])

@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_shopper_telemetry(payload: ShopperTelemetryPayload, db: AsyncSession = Depends(get_db)):
    """Ingest privacy-anonymized shopper detection & coordinate metadata from Edge cameras."""
    coords = [c.model_dump() for c in payload.spatial_coords] if payload.spatial_coords else []
    record = ShopperTelemetry(
        camera_id=payload.camera_id,
        shopper_count=payload.shopper_count,
        avg_dwell_time_sec=payload.avg_dwell_time_sec,
        spatial_coords=coords,
        demography_summary=payload.demography_summary
    )
    db.add(record)
    await db.commit()
    
    await ws_manager.broadcast({
        "event": "SHOPPER_TELEMETRY",
        "data": payload.model_dump()
    })
    return {"status": "success", "message": "Shopper telemetry recorded."}

@router.post("/queue", status_code=status.HTTP_201_CREATED)
async def ingest_queue_metric(payload: QueueMetricPayload, db: AsyncSession = Depends(get_db)):
    """Ingest queue length & wait time estimation from checkout Edge cameras."""
    est_wait = payload.estimated_wait_sec or (payload.shopper_count * 120.0)
    record = QueueMetric(
        camera_id=payload.camera_id,
        queue_id=payload.queue_id,
        queue_name=payload.queue_name,
        shopper_count=payload.shopper_count,
        estimated_wait_sec=est_wait,
        cashier_status=payload.cashier_status
    )
    db.add(record)
    await db.commit()
    
    await AlertEngine.evaluate_queue_telemetry(db, payload)
    return {"status": "success", "message": "Queue metric recorded."}

@router.post("/shelf", status_code=status.HTTP_201_CREATED)
async def ingest_shelf_metric(payload: ShelfMetricPayload, db: AsyncSession = Depends(get_db)):
    """Ingest shelf fill level and out-of-stock status from aisle Edge cameras."""
    record = ShelfMetric(
        aisle_name=payload.aisle_name,
        category=payload.category,
        fill_percentage=payload.fill_percentage,
        is_out_of_stock=payload.fill_percentage <= 20.0,
        product_count=payload.product_count
    )
    db.add(record)
    await db.commit()
    
    await AlertEngine.evaluate_shelf_telemetry(db, payload)
    return {"status": "success", "message": "Shelf metric recorded."}

@router.post("/hardware", status_code=status.HTTP_201_CREATED)
async def ingest_hardware_telemetry(payload: EdgeHardwareTelemetryPayload, db: AsyncSession = Depends(get_db)):
    """Ingest Qualcomm SNPE NPU performance telemetry."""
    record = EdgeHardwareTelemetry(
        device_id=payload.device_id,
        fps=payload.fps,
        npu_load_pct=payload.npu_load_pct,
        memory_usage_mb=payload.memory_usage_mb,
        inference_latency_ms=payload.inference_latency_ms,
        bandwidth_saved_mb=payload.bandwidth_saved_mb
    )
    db.add(record)
    await db.commit()
    
    await AlertEngine.evaluate_hardware_telemetry(db, payload)
    return {"status": "success", "message": "Hardware telemetry recorded."}

import base64
import os
import numpy as np
import cv2
from pydantic import BaseModel
from typing import List, Optional

_yolo_detector = None

def get_detector():
    global _yolo_detector
    if _yolo_detector is None:
        try:
            from ultralytics import YOLO
            # Search possible paths for yolov8n.pt
            possible_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "yolov8n.pt"),
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "yolov8n.pt"),
                "yolov8n.pt",
                "cv-queue/yolov8n.pt"
            ]
            chosen = "yolov8n.pt"
            for p in possible_paths:
                if os.path.exists(p):
                    chosen = p
                    break
            _yolo_detector = YOLO(chosen)
        except Exception as e:
            print(f"Warning: could not load YOLO model: {e}")
    return _yolo_detector

class FrameDetectionRequest(BaseModel):
    image_base64: str
    zone: Optional[List[float]] = [0.2, 0.15, 0.8, 0.85]

@router.post("/detect_frame")
async def detect_frame(payload: FrameDetectionRequest, db: AsyncSession = Depends(get_db)):
    """Runs real-time YOLOv8 person detection on a webcam frame."""
    try:
        data = payload.image_base64
        if "," in data:
            data = data.split(",", 1)[1]
        img_bytes = base64.b64decode(data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"status": "error", "message": "Invalid image data", "boxes": [], "in_queue_count": 0}

        h, w = frame.shape[:2]
        model = get_detector()
        boxes = []
        in_queue_count = 0

        if model is not None:
            results = model(frame, verbose=False)[0]
            zx1, zy1, zx2, zy2 = payload.zone or [0.2, 0.15, 0.8, 0.85]

            for idx, box in enumerate(results.boxes):
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if cls_id != 0 or conf < 0.35: # Class 0 is person
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cx = ((x1 + x2) / 2.0) / float(w)
                cy = ((y1 + y2) / 2.0) / float(h)

                in_queue = (zx1 <= cx <= zx2) and (zy1 <= cy <= zy2)
                if in_queue:
                    in_queue_count += 1

                boxes.append({
                    "id": 100 + idx,
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                    "conf": round(conf, 2),
                    "in_queue": in_queue
                })

        # Also ingest metric to db & alert engine
        if in_queue_count > 0:
            queue_payload = QueueMetricPayload(
                camera_id="cam-02-checkout-1",
                queue_id="queue-counter-1",
                queue_name="Cashier Counter 1",
                shopper_count=in_queue_count,
                estimated_wait_sec=in_queue_count * 45.0,
                cashier_status="OVERLOADED" if in_queue_count >= 5 else "OPEN"
            )
            await AlertEngine.evaluate_queue_telemetry(db, queue_payload)

        return {
            "status": "success",
            "frame_width": w,
            "frame_height": h,
            "total_detected": len(boxes),
            "in_queue_count": in_queue_count,
            "estimated_wait_sec": in_queue_count * 45,
            "boxes": boxes
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "boxes": [], "in_queue_count": 0}

