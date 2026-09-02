from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.schemas import QueueStatusResponse
from app.models.domain import QueueMetric, AlertLog
from app.services.websocket_manager import ws_manager
from app.config import settings
from typing import List
from datetime import datetime, timezone

router = APIRouter(prefix="/queue", tags=["Queue Management"])


@router.get("/status", response_model=List[QueueStatusResponse])
async def get_queue_statuses(db: AsyncSession = Depends(get_db)):
    """Fetch live checkout queue metrics, wait times, and dynamic cashier recommendations."""

    subq = select(
        QueueMetric.queue_id,
        QueueMetric.camera_id,
        QueueMetric.queue_name,
        QueueMetric.shopper_count,
        QueueMetric.estimated_wait_sec,
        QueueMetric.cashier_status
    ).order_by(QueueMetric.timestamp.desc())

    res = await db.execute(subq)
    rows = res.all()

    seen_queues = set()
    response = []

    for row in rows:
        if row.queue_id in seen_queues:
            continue

        seen_queues.add(row.queue_id)

        count = row.shopper_count or 0
        raw_status = row.cashier_status or "OPEN"
        est_wait = row.estimated_wait_sec or (
            count * settings.QUEUE_AVG_CHECKOUT_TIME_SEC
        )

        if raw_status == "CLOSED":
            response.append(
                QueueStatusResponse(
                    queue_id=row.queue_id,
                    queue_name=row.queue_name,
                    camera_id=row.camera_id,
                    shopper_count=0,
                    estimated_wait_sec=0.0,
                    cashier_status="CLOSED",
                    recommendation="CLOSED - Inactive Counter"
                )
            )
            continue

        if count >= 6:
            c_status = "OVERLOADED"
        elif count >= 4:
            c_status = "BUSY"
        else:
            c_status = "OPEN"

        response.append(
            QueueStatusResponse(
                queue_id=row.queue_id,
                queue_name=row.queue_name,
                camera_id=row.camera_id,
                shopper_count=count,
                estimated_wait_sec=round(est_wait, 1),
                cashier_status=c_status,
                recommendation="OPTIMAL - Smooth Flow"
                if c_status == "OPEN"
                else "MODERATE - Monitor Queue Length"
                if c_status == "BUSY"
                else "OVERLOADED - Additional Counter Required"
            )
        )

    if not response:
        response = [
            QueueStatusResponse(
                queue_id="queue-counter-1",
                queue_name="Cashier Counter 1",
                camera_id="cam-02-checkout-1",
                shopper_count=5,
                estimated_wait_sec=575.0,
                cashier_status="BUSY",
                recommendation="MODERATE - Monitor Queue Length"
            ),
            QueueStatusResponse(
                queue_id="queue-counter-2",
                queue_name="Cashier Counter 2",
                camera_id="cam-03-checkout-2",
                shopper_count=2,
                estimated_wait_sec=220.0,
                cashier_status="OPEN",
                recommendation="OPTIMAL - Smooth Flow"
            ),
            QueueStatusResponse(
                queue_id="queue-counter-3",
                queue_name="Cashier Counter 3",
                camera_id="cam-04-checkout-3",
                shopper_count=0,
                estimated_wait_sec=0.0,
                cashier_status="CLOSED",
                recommendation="CLOSED - Inactive Counter"
            )
        ]

    open_counters = [
        q for q in response
        if q.cashier_status != "CLOSED"
    ]

    closed_counters = [
        q for q in response
        if q.cashier_status == "CLOSED"
    ]

    overloaded = [
        q for q in open_counters
        if q.cashier_status == "OVERLOADED"
    ]

    if overloaded and closed_counters:
        counter_to_open = closed_counters[0]

        for queue in response:
            if queue in overloaded:
                queue.recommendation = (
                    f"OVERLOADED - Open {counter_to_open.queue_name}"
                )

    elif overloaded and not closed_counters:
        for queue in overloaded:
            queue.recommendation = (
                "OVERLOADED - All counters currently open"
            )

    return response


@router.post("/{queue_id}/toggle")
async def toggle_counter_status(
    queue_id: str,
    action: str = Body(
        ...,
        embed=True,
        description="Action: OPEN or CLOSE"
    ),
    db: AsyncSession = Depends(get_db)
):
    """Open or close any cashier counter dynamically."""

    action_upper = action.upper()

    if action_upper not in ["OPEN", "CLOSE"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be OPEN or CLOSE"
        )

    queue_names = {
        "queue-counter-1": "Cashier Counter 1",
        "queue-counter-2": "Cashier Counter 2",
        "queue-counter-3": "Cashier Counter 3",
    }

    camera_ids = {
        "queue-counter-1": "cam-02-checkout-1",
        "queue-counter-2": "cam-03-checkout-2",
        "queue-counter-3": "cam-04-checkout-3",
    }

    if queue_id not in queue_names:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown queue: {queue_id}"
        )

    queue_name = queue_names[queue_id]
    cam_id = camera_ids[queue_id]

    new_status = (
        "OPEN"
        if action_upper == "OPEN"
        else "CLOSED"
    )

    shopper_count = 1 if action_upper == "OPEN" else 0

    est_wait = (
        shopper_count *
        settings.QUEUE_AVG_CHECKOUT_TIME_SEC
    )

    metric = QueueMetric(
        camera_id=cam_id,
        queue_id=queue_id,
        queue_name=queue_name,
        shopper_count=shopper_count,
        estimated_wait_sec=est_wait,
        cashier_status=new_status,
        is_bottleneck=False
    )

    db.add(metric)

    if action_upper == "OPEN":
        stmt = select(AlertLog).where(
            AlertLog.alert_type == "QUEUE_OVERFLOW",
            AlertLog.is_acknowledged == False
        )

        res = await db.execute(stmt)
        alerts = res.scalars().all()

        for alert in alerts:
            alert.is_acknowledged = True
            alert.resolved_at = datetime.now(timezone.utc)

    await db.commit()

    await ws_manager.broadcast({
        "event": "QUEUE_ACTION",
        "data": {
            "queue_id": queue_id,
            "action": action_upper,
            "status": new_status,
            "message": (
                f"{queue_name} has been "
                f"{action_upper.lower()}ed successfully."
            )
        }
    })

    return {
        "status": "success",
        "queue_id": queue_id,
        "cashier_status": new_status,
        "message": f"{queue_name} is now {new_status}."
    }
