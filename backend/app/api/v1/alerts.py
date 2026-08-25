from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.schemas import AlertLogResponse
from app.models.domain import AlertLog
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/alerts", tags=["System Alerts"])

@router.get("", response_model=List[AlertLogResponse])
async def get_alerts(
    unacknowledged_only: bool = False,
    severity: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """List store alerts (Queue congestion, Shelf stock-out, Qualcomm Hardware load)."""
    stmt = select(AlertLog)
    if unacknowledged_only:
        stmt = stmt.where(AlertLog.is_acknowledged == False)
    if severity:
        stmt = stmt.where(AlertLog.severity == severity.upper())
        
    stmt = stmt.order_by(AlertLog.timestamp.desc()).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an alert as acknowledged by store manager."""
    stmt = select(AlertLog).where(AlertLog.id == alert_id)
    res = await db.execute(stmt)
    alert = res.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert ID not found.")
        
    alert.is_acknowledged = True
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "success", "message": f"Alert #{alert_id} acknowledged."}
