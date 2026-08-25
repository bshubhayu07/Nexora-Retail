from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import AlertLog, QueueMetric, ShelfMetric, EdgeHardwareTelemetry
from app.schemas.schemas import QueueMetricPayload, ShelfMetricPayload, EdgeHardwareTelemetryPayload
from app.services.websocket_manager import ws_manager
from app.config import settings
from datetime import datetime
import logging

logger = logging.getLogger("alert_engine")

class AlertEngine:
    @staticmethod
    async def evaluate_queue_telemetry(db: AsyncSession, payload: QueueMetricPayload):
        """
        Evaluate queue thresholds:
        - If shopper count > settings.QUEUE_ALERT_THRESHOLD (default 5): Trigger QUEUE_OVERFLOW warning/critical.
        """
        est_wait = payload.shopper_count * settings.QUEUE_AVG_CHECKOUT_TIME_SEC
        
        if payload.shopper_count >= settings.QUEUE_ALERT_THRESHOLD:
            severity = "CRITICAL" if payload.shopper_count > 8 else "WARNING"
            title = f"High Queue Congestion at {payload.queue_name}"
            msg = (f"{payload.queue_name} has {payload.shopper_count} shoppers in line. "
                   f"Estimated wait time is {round(est_wait / 60, 1)} minutes. "
                   f"Action Required: Open additional cashier counter.")
            
            # Check if recent unresolved alert exists for this queue to avoid duplicate spamming
            stmt = select(AlertLog).where(
                AlertLog.source_id == payload.queue_id,
                AlertLog.is_acknowledged == False,
                AlertLog.alert_type == "QUEUE_OVERFLOW"
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if not existing:
                new_alert = AlertLog(
                    alert_type="QUEUE_OVERFLOW",
                    severity=severity,
                    title=title,
                    message=msg,
                    source_id=payload.queue_id
                )
                db.add(new_alert)
                await db.commit()
                await db.refresh(new_alert)
                
                # Broadcast real-time alert over WebSocket
                await ws_manager.broadcast({
                    "event": "NEW_ALERT",
                    "data": {
                        "id": new_alert.id,
                        "type": new_alert.alert_type,
                        "severity": new_alert.severity,
                        "title": new_alert.title,
                        "message": new_alert.message,
                        "timestamp": new_alert.timestamp.isoformat()
                    }
                })
                logger.info(f"Triggered Alert: {title}")

    @staticmethod
    async def evaluate_shelf_telemetry(db: AsyncSession, payload: ShelfMetricPayload):
        """
        Evaluate shelf inventory thresholds:
        - If fill_percentage < settings.SHELF_RESTOCK_THRESHOLD_PCT (default 20%): Trigger SHELF_EMPTY alert.
        """
        if payload.fill_percentage <= settings.SHELF_RESTOCK_THRESHOLD_PCT:
            severity = "CRITICAL" if payload.fill_percentage <= 5.0 else "WARNING"
            title = f"Low Stock Alert: {payload.aisle_name} ({payload.category})"
            msg = (f"Shelf in {payload.aisle_name} ({payload.category}) fill level has dropped to {payload.fill_percentage:.1f}%. "
                   f"Estimated remaining items: {payload.product_count}. Immediate restock advised.")
            
            source_id = f"shelf-{payload.aisle_name.replace(' ', '-').lower()}"
            
            stmt = select(AlertLog).where(
                AlertLog.source_id == source_id,
                AlertLog.is_acknowledged == False,
                AlertLog.alert_type == "SHELF_EMPTY"
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if not existing:
                new_alert = AlertLog(
                    alert_type="SHELF_EMPTY",
                    severity=severity,
                    title=title,
                    message=msg,
                    source_id=source_id
                )
                db.add(new_alert)
                await db.commit()
                await db.refresh(new_alert)
                
                await ws_manager.broadcast({
                    "event": "NEW_ALERT",
                    "data": {
                        "id": new_alert.id,
                        "type": new_alert.alert_type,
                        "severity": new_alert.severity,
                        "title": new_alert.title,
                        "message": new_alert.message,
                        "timestamp": new_alert.timestamp.isoformat()
                    }
                })

    @staticmethod
    async def evaluate_hardware_telemetry(db: AsyncSession, payload: EdgeHardwareTelemetryPayload):
        """
        Evaluate edge hardware telemetry:
        - High NPU load warning.
        """
        if payload.npu_load_pct >= settings.NPU_HIGH_LOAD_THRESHOLD_PCT:
            title = f"Edge Device High NPU Load: {payload.device_id}"
            msg = f"NPU load on {payload.device_id} reached {payload.npu_load_pct:.1f}%. Inference latency: {payload.inference_latency_ms:.1f}ms."
            
            stmt = select(AlertLog).where(
                AlertLog.source_id == payload.device_id,
                AlertLog.is_acknowledged == False,
                AlertLog.alert_type == "HARDWARE_WARN"
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if not existing:
                new_alert = AlertLog(
                    alert_type="HARDWARE_WARN",
                    severity="WARNING",
                    title=title,
                    message=msg,
                    source_id=payload.device_id
                )
                db.add(new_alert)
                await db.commit()
