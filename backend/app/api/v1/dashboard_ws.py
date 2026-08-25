from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger("dashboard_ws")
router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/api/v1/dashboard/live")
async def dashboard_websocket_endpoint(websocket: WebSocket):
    """Real-time WebSocket feed pushing live shopper analytics, alerts, and camera overlays to Frontend clients."""
    await ws_manager.connect(websocket, channel="dashboard_live")
    try:
        while True:
            # Keep connection alive & listen for client ping/messages
            data = await websocket.receive_text()
            logger.debug(f"WS message received: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel="dashboard_live")
    except Exception as e:
        logger.warning(f"WS client exception: {e}")
        ws_manager.disconnect(websocket, channel="dashboard_live")
