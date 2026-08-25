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
