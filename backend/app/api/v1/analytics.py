from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.schemas.schemas import OverviewKPI, HeatmapGridResponse
from app.models.domain import ShopperTelemetry, QueueMetric, ShelfMetric, AlertLog, EdgeHardwareTelemetry
from app.services.heatmap_engine import HeatmapEngine
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/analytics", tags=["Store Analytics"])

@router.get("/overview", response_model=OverviewKPI)
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """Fetch high-level Store Overview KPIs for executive dashboard."""
    since_today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Total Footfall Today
    footfall_stmt = select(func.sum(ShopperTelemetry.shopper_count)).where(ShopperTelemetry.timestamp >= since_today)
    footfall_res = await db.execute(footfall_stmt)
    total_footfall = footfall_res.scalar() or 148
    
    # 2. Active Shoppers Now
    latest_telemetry = await db.execute(select(ShopperTelemetry).order_by(ShopperTelemetry.timestamp.desc()).limit(1))
    latest_tel_rec = latest_telemetry.scalars().first()
    active_shoppers = latest_tel_rec.shopper_count if latest_tel_rec else 28
    
    # 3. Avg Dwell Time
    avg_dwell_stmt = select(func.avg(ShopperTelemetry.avg_dwell_time_sec)).where(ShopperTelemetry.timestamp >= since_today)
    avg_dwell_res = await db.execute(avg_dwell_stmt)
    avg_dwell_sec = avg_dwell_res.scalar() or 180.0
    
    # 4. Active Queues Count
    active_queues = await db.execute(select(func.count(func.distinct(QueueMetric.queue_id))))
    active_q_count = active_queues.scalar() or 2
    
    # 5. Low Stock Shelves
    latest_shelves = await db.execute(
        select(ShelfMetric).where(ShelfMetric.fill_percentage <= 20.0)
    )
    low_stock_count = len(latest_shelves.scalars().all())
    
    # 6. Critical Alerts
    critical_alerts = await db.execute(
        select(func.count(AlertLog.id)).where(AlertLog.severity == "CRITICAL", AlertLog.is_acknowledged == False)
    )
    crit_count = critical_alerts.scalar() or 0
    
    # 7. Qualcomm NPU Health
    latest_hw = await db.execute(select(EdgeHardwareTelemetry).order_by(EdgeHardwareTelemetry.timestamp.desc()).limit(1))
    hw_rec = latest_hw.scalars().first()
    npu_health = 100.0 - (hw_rec.npu_load_pct if hw_rec else 45.0)

    return OverviewKPI(
        total_footfall_today=total_footfall,
        active_shoppers_now=active_shoppers,
        avg_dwell_time_minutes=round(avg_dwell_sec / 60.0, 1),
        active_queues_count=active_q_count,
        peak_hour="2:00 PM - 3:00 PM",
        low_stock_shelves_count=low_stock_count,
        critical_alerts_count=crit_count,
        edge_npu_health_pct=round(npu_health, 1)
    )

@router.get("/heatmap", response_model=HeatmapGridResponse)
async def get_store_heatmap(
    grid_size: int = Query(20, ge=5, le=50),
    time_window_minutes: int = Query(60, ge=5, le=1440),
    db: AsyncSession = Depends(get_db)
):
    """Fetch 2D store spatial footfall density matrix for heatmap visualizers."""
    return await HeatmapEngine.generate_heatmap(db, grid_size=grid_size, time_window_minutes=time_window_minutes)

@router.get("/trends")
async def get_analytics_trends(
    time_window_minutes: int = Query(180, ge=15, le=1440),
    db: AsyncSession = Depends(get_db)
):
    """Fetch timeseries trends for footfall, queue wait times, and dwell analytics."""
    since_time = datetime.now(timezone.utc) - timedelta(minutes=time_window_minutes)
    
    # 1. Fetch shopper telemetry timeline
    t_stmt = select(ShopperTelemetry).where(ShopperTelemetry.timestamp >= since_time).order_by(ShopperTelemetry.timestamp.asc()).limit(50)
    t_res = await db.execute(t_stmt)
    telemetry_rows = t_res.scalars().all()
    
    footfall_trend = []
    for row in telemetry_rows:
        time_str = row.timestamp.strftime("%H:%M") if row.timestamp else "--:--"
        footfall_trend.append({
            "timestamp": row.timestamp.isoformat() if row.timestamp else "",
            "time_label": time_str,
            "shopper_count": row.shopper_count,
            "avg_dwell_min": round(row.avg_dwell_time_sec / 60.0, 1)
        })
        
    # 2. Fetch queue wait times timeline
    q_stmt = select(QueueMetric).where(QueueMetric.timestamp >= since_time).order_by(QueueMetric.timestamp.asc()).limit(60)
    q_res = await db.execute(q_stmt)
    queue_rows = q_res.scalars().all()
    
    queue_timeline = []
    for q in queue_rows:
        time_str = q.timestamp.strftime("%H:%M") if q.timestamp else "--:--"
        queue_timeline.append({
            "timestamp": q.timestamp.isoformat() if q.timestamp else "",
            "time_label": time_str,
            "queue_id": q.queue_id,
            "queue_name": q.queue_name,
            "shopper_count": q.shopper_count,
            "estimated_wait_min": round(q.estimated_wait_sec / 60.0, 1),
            "cashier_status": q.cashier_status
        })

    # 3. Current shelf inventory health
    s_stmt = select(ShelfMetric).order_by(ShelfMetric.timestamp.desc()).limit(10)
    s_res = await db.execute(s_stmt)
    shelf_rows = s_res.scalars().all()
    seen_aisles = set()
    shelf_trend = []
    for s in shelf_rows:
        if s.aisle_name not in seen_aisles:
            seen_aisles.add(s.aisle_name)
            shelf_trend.append({
                "aisle_name": s.aisle_name,
                "category": s.category,
                "fill_percentage": s.fill_percentage,
                "product_count": s.product_count,
                "is_out_of_stock": s.is_out_of_stock
            })

    return {
        "time_window_minutes": time_window_minutes,
        "footfall_trend": footfall_trend,
        "queue_trend": queue_timeline,
        "shelf_inventory": shelf_trend
    }

