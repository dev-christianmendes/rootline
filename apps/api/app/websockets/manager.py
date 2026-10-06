from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("rootline.websockets")


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        # incident_id -> set of WebSocket connections
        self._incident_connections: Dict[str, Set[WebSocket]] = {}
        # service_id -> set of WebSocket connections for metrics
        self._metrics_connections: Dict[str, Set[WebSocket]] = {}
        # General connections for logs/broadcast
        self._log_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect_incident(self, incident_id: str, websocket: WebSocket) -> None:
        """Register a connection for incident updates."""
        await websocket.accept()
        async with self._lock:
            if incident_id not in self._incident_connections:
                self._incident_connections[incident_id] = set()
            self._incident_connections[incident_id].add(websocket)
        logger.info(f"Incident WS connected: {incident_id} (total: {len(self._incident_connections[incident_id])})")

    async def disconnect_incident(self, incident_id: str, websocket: WebSocket) -> None:
        """Unregister a connection for incident updates."""
        async with self._lock:
            if incident_id in self._incident_connections:
                self._incident_connections[incident_id].discard(websocket)
                if not self._incident_connections[incident_id]:
                    del self._incident_connections[incident_id]
        logger.info(f"Incident WS disconnected: {incident_id}")

    async def connect_metrics(self, service_id: str, websocket: WebSocket) -> None:
        """Register a connection for service metrics updates."""
        await websocket.accept()
        async with self._lock:
            if service_id not in self._metrics_connections:
                self._metrics_connections[service_id] = set()
            self._metrics_connections[service_id].add(websocket)
        logger.info(f"Metrics WS connected: {service_id} (total: {len(self._metrics_connections[service_id])})")

    async def disconnect_metrics(self, service_id: str, websocket: WebSocket) -> None:
        """Unregister a connection for service metrics updates."""
        async with self._lock:
            if service_id in self._metrics_connections:
                self._metrics_connections[service_id].discard(websocket)
                if not self._metrics_connections[service_id]:
                    del self._metrics_connections[service_id]
        logger.info(f"Metrics WS disconnected: {service_id}")

    async def connect_logs(self, websocket: WebSocket) -> None:
        """Register a connection for log updates."""
        await websocket.accept()
        async with self._lock:
            self._log_connections.add(websocket)
        logger.info(f"Logs WS connected (total: {len(self._log_connections)})")

    async def disconnect_logs(self, websocket: WebSocket) -> None:
        """Unregister a connection for log updates."""
        async with self._lock:
            self._log_connections.discard(websocket)
        logger.info(f"Logs WS disconnected (total: {len(self._log_connections)})")

    async def broadcast_incident(self, incident_id: str, message: Dict[str, Any]) -> None:
        """Broadcast a message to all connections watching an incident."""
        async with self._lock:
            connections = self._incident_connections.get(incident_id, set()).copy()

        if not connections:
            return

        dead = set()
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    self._incident_connections.get(incident_id, set()).discard(ws)

    async def broadcast_metrics(self, service_id: str, message: Dict[str, Any]) -> None:
        """Broadcast a message to all connections watching service metrics."""
        async with self._lock:
            connections = self._metrics_connections.get(service_id, set()).copy()

        if not connections:
            return

        dead = set()
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    self._metrics_connections.get(service_id, set()).discard(ws)

    async def broadcast_logs(self, message: Dict[str, Any]) -> None:
        """Broadcast a log message to all log connections."""
        async with self._lock:
            connections = self._log_connections.copy()

        if not connections:
            return

        dead = set()
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)

        if dead:
            async with self._lock:
                self._log_connections.difference_update(dead)

    def get_incident_connection_count(self, incident_id: str) -> int:
        """Get number of connections for an incident."""
        return len(self._incident_connections.get(incident_id, set()))

    def get_metrics_connection_count(self, service_id: str) -> int:
        """Get number of connections for service metrics."""
        return len(self._metrics_connections.get(service_id, set()))

    def get_logs_connection_count(self) -> int:
        """Get number of connections for logs."""
        return len(self._log_connections)


# Global connection manager instance
manager = ConnectionManager()