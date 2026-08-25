from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.schemas import QueueStatusResponse
from app.models.domain import QueueMetric
from app.config import settings
from typing import List

router = APIRouter(prefix="/queue", tags=["Queue Management"])

@router.get("/status", response_model=List[QueueStatusResponse])
async def get_queue_statuses(db: AsyncSession = Depends(get_db)):
    """Fetch live checkout queue metrics, wait times, and cashier allocation recommendations."""
    # Get distinct latest metrics for each queue_id
    subq = select(
        QueueMetric.queue_id,
        QueueMetric.camera_id,
        QueueMetric.queue_name,
        QueueMetric.shopper_count,
        QueueMetric.estimated_wait_sec,
        QueueMetric.cashier_status
    ).order_by(QueueMetric.timestamp.desc()).limit(10)
    
    res = await db.execute(subq)
    rows = res.all()
    
    seen_queues = set()
    response = []
    
    for row in rows:
        if row.queue_id in seen_queues:
            continue
        seen_queues.add(row.queue_id)
        
        count = row.shopper_count
        est_wait = row.estimated_wait_sec or (count * settings.QUEUE_AVG_CHECKOUT_TIME_SEC)
        
        if count >= 6:
            rec = "OVERLOADED - Open Counter 3 Immediately"
            c_status = "OVERLOADED"
        elif count >= 4:
            rec = "MODERATE - Monitor Queue Length"
            c_status = "BUSY"
        else:
            rec = "OPTIMAL - Smooth Flow"
            c_status = "OPEN"
            
        response.append(QueueStatusResponse(
            queue_id=row.queue_id,
            queue_name=row.queue_name,
            camera_id=row.camera_id,
            shopper_count=count,
            estimated_wait_sec=round(est_wait, 1),
            cashier_status=c_status,
            recommendation=rec
        ))
        
    if not response:
        # Sample response if DB is fresh
        response = [
            QueueStatusResponse(
                queue_id="queue-counter-1",
                queue_name="Cashier Counter 1",
                camera_id="cam-02-checkout-1",
                shopper_count=5,
                estimated_wait_sec=575.0,
                cashier_status="BUSY",
                recommendation="MODERATE - Open Counter 2"
            ),
            QueueStatusResponse(
                queue_id="queue-counter-2",
                queue_name="Cashier Counter 2",
                camera_id="cam-03-checkout-2",
                shopper_count=2,
                estimated_wait_sec=220.0,
                cashier_status="OPEN",
                recommendation="OPTIMAL - Smooth Flow"
            )
        ]
        
    return response
