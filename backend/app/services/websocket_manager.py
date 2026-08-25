from fastapi import WebSocket
from typing import List, Dict, Set
import json
import logging

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # Active connections categorized by channel (e.g. 'dashboard_live', 'edge_ingest')
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "dashboard_live": set(),
            "edge_ingest": set()
        }

    async def connect(self, websocket: WebSocket, channel: str = "dashboard_live"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        logger.info(f"WebSocket client connected to channel: {channel}. Total: {len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "dashboard_live"):
        if channel in self.active_connections and websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)
            logger.info(f"WebSocket client disconnected from channel: {channel}")

    async def broadcast(self, message: dict, channel: str = "dashboard_live"):
        if channel not in self.active_connections:
            return
        
        dead_connections = set()
        for connection in self.active_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to WS client: {e}")
                dead_connections.add(connection)
                
        for dead in dead_connections:
            self.disconnect(dead, channel)

ws_manager = ConnectionManager()
