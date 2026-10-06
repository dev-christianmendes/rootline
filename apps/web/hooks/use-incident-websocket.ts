"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Incident } from "@rootline/types";

interface UseIncidentWebSocketOptions {
  incidentId: string;
  onIncidentUpdate?: (incident: Incident) => void;
  enabled?: boolean;
}

interface UseIncidentWebSocketReturn {
  isConnected: boolean;
  lastUpdate: Incident | null;
  error: Event | null;
}

export function useIncidentWebSocket({
  incidentId,
  onIncidentUpdate,
  enabled = true,
}: UseIncidentWebSocketOptions): UseIncidentWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Incident | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const onIncidentUpdateRef = useRef(onIncidentUpdate);

  onIncidentUpdateRef.current = onIncidentUpdate;

  const handleMessage = useCallback(
    (message: { type: string; data?: Incident }) => {
      if (
        (message.type === "incident_update" ||
          message.type === "incident_updated") &&
        message.data
      ) {
        setLastUpdate(message.data);
        onIncidentUpdateRef.current?.(message.data);
      }
    },
    [],
  );

  const handleOpen = useCallback(() => {
    setIsConnected(true);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleError = useCallback((err: Event) => {
    setError(err);
  }, []);

  const { sendMessage } = useWebSocket<Incident>({
    url: `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/ws/incidents/${incidentId}`,
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
    reconnect: enabled,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  // Send ping to keep connection alive
  useEffect(() => {
    if (!enabled || !isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, isConnected, sendMessage]);

  return {
    isConnected,
    lastUpdate,
    error,
  };
}
