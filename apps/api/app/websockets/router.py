from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, WebSocketException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_optional_current_user
from app.db import get_db
from app.models import Incident, LogEntry, MetricPoint, Service, User as UserModel
from app.schemas import IncidentOut, MetricSeriesOut, ServiceOut
from app.websockets.manager import manager

router = APIRouter(tags=["websockets"])

logger = logging.getLogger("rootline.websockets")


@router.websocket("/ws/incidents/{incident_id}")
async def websocket_incidents(
    websocket: WebSocket,
    incident_id: str,
    db: Session = Depends(get_db),
) -> None:
    """WebSocket endpoint for real-time incident updates."""
    # Check if incident exists
    incident = db.get(Incident, incident_id)
    if incident is None:
        await websocket.close(code=1008, reason="Incident not found")
        return

    await manager.connect_incident(incident_id, websocket)

    try:
        # Send initial incident state
        incident_data = IncidentOut.model_validate(incident).model_dump(by_alias=True)
        await websocket.send_text(json.dumps({
            "type": "incident_update",
            "data": incident_data,
        }))

        # Keep connection alive, handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle ping/pong
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.warning(f"Incident WS error: {e}")
                break

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect_incident(incident_id, websocket)


@router.websocket("/ws/services/{service_id}/metrics")
async def websocket_service_metrics(
    websocket: WebSocket,
    service_id: str,
    db: Session = Depends(get_db),
    metric: Optional[str] = Query(default=None, description="Filter by metric name"),
) -> None:
    """WebSocket endpoint for real-time service metrics updates."""
    # Check if service exists
    service = db.get(Service, service_id)
    if service is None:
        await websocket.close(code=1008, reason="Service not found")
        return

    await manager.connect_metrics(service_id, websocket)

    try:
        # Send initial metrics state
        from app.routers.services import parse_datetime
        from datetime import datetime, timezone
        
        stmt = db.query(MetricPoint).filter(MetricPoint.service_id == service_id)
        if metric:
            stmt = stmt.filter(MetricPoint.metric == metric)
        points = stmt.order_by(MetricPoint.series_position, MetricPoint.timestamp).all()

        # Group points into series
        series: list = []
        for point in points:
            if (
                series
                and series[-1]["metric"] == point.metric
                and series[-1]["unit"] == point.unit
            ):
                series[-1]["points"].append({
                    "timestamp": point.timestamp.isoformat().replace("+00:00", "Z"),
                    "value": point.value,
                })
            else:
                series.append({
                    "serviceId": point.service_id,
                    "metric": point.metric,
                    "unit": point.unit,
                    "points": [{
                        "timestamp": point.timestamp.isoformat().replace("+00:00", "Z"),
                        "value": point.value,
                    }],
                })

        await websocket.send_text(json.dumps({
            "type": "metrics_update",
            "data": series,
        }))

        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.warning(f"Metrics WS error: {e}")
                break

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect_metrics(service_id, websocket)


@router.websocket("/ws/logs")
async def websocket_logs(
    websocket: WebSocket,
    db: Session = Depends(get_db),
    incident_id: Optional[str] = Query(default=None, alias="incidentId"),
    service_id: Optional[str] = Query(default=None, alias="serviceId"),
    level: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
) -> None:
    """WebSocket endpoint for real-time log updates."""
    await manager.connect_logs(websocket)

    try:
        # Send initial logs
        stmt = db.query(LogEntry)
        if incident_id:
            stmt = stmt.filter(LogEntry.incident_id == incident_id)
        if service_id:
            stmt = stmt.filter(LogEntry.service_id == service_id)
        if level:
            stmt = stmt.filter(LogEntry.level == level)
        
        logs = stmt.order_by(LogEntry.timestamp.desc()).limit(limit).all()
        
        log_data = []
        for log in reversed(logs):  # Reverse to show oldest first
            log_data.append({
                "id": log.id,
                "serviceId": log.service_id,
                "incidentId": log.incident_id,
                "timestamp": log.timestamp.isoformat().replace("+00:00", "Z"),
                "level": log.level,
                "message": log.message,
                "fields": log.fields,
            })

        await websocket.send_text(json.dumps({
            "type": "logs_update",
            "data": log_data,
        }))

        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.warning(f"Logs WS error: {e}")
                break

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect_logs(websocket)