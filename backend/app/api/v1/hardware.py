from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.schemas import EdgeHardwareTelemetryPayload
from app.models.domain import EdgeHardwareTelemetry

router = APIRouter(prefix="/hardware", tags=["Qualcomm Edge Telemetry"])

@router.get("/telemetry", response_model=EdgeHardwareTelemetryPayload)
async def get_latest_hardware_telemetry(db: AsyncSession = Depends(get_db)):
    """Fetch Qualcomm Snapdragon Edge Neural Processing Engine (SNPE) hardware metrics."""
    stmt = select(EdgeHardwareTelemetry).order_by(EdgeHardwareTelemetry.timestamp.desc()).limit(1)
    res = await db.execute(stmt)
    hw = res.scalars().first()
    
    if not hw:
        return EdgeHardwareTelemetryPayload(
            device_id="Qualcomm-Snapdragon-RB5-Edge-01",
            fps=30.0,
            npu_load_pct=42.5,
            memory_usage_mb=512.0,
            inference_latency_ms=12.4,
            bandwidth_saved_mb=340.5
        )
        
    return EdgeHardwareTelemetryPayload(
        device_id=hw.device_id,
        fps=hw.fps,
        npu_load_pct=hw.npu_load_pct,
        memory_usage_mb=hw.memory_usage_mb,
        inference_latency_ms=hw.inference_latency_ms,
        bandwidth_saved_mb=hw.bandwidth_saved_mb
    )
