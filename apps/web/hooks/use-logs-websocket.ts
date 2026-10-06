"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { LogEntry } from "@rootline/types";

interface UseLogsWebSocketOptions {
  incidentId?: string;
  serviceId?: string;
  level?: string;
  limit?: number;
  onLogsUpdate?: (logs: LogEntry[]) => void;
  enabled?: boolean;
}

interface UseLogsWebSocketReturn {
  isConnected: boolean;
  lastUpdate: LogEntry[] | null;
  error: Event | null;
}

export function useLogsWebSocket({
  incidentId,
  serviceId,
  level,
  limit = 100,
  onLogsUpdate,
  enabled = true,
}: UseLogsWebSocketOptions): UseLogsWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const onLogsUpdateRef = useRef(onLogsUpdate);

  onLogsUpdateRef.current = onLogsUpdate;

  const handleMessage = useCallback(
    (message: { type: string; data?: LogEntry[] }) => {
      if (message.type === "logs_update" && message.data) {
        setLastUpdate(message.data);
        onLogsUpdateRef.current?.(message.data);
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

  const queryParams = new URLSearchParams();
  if (incidentId) queryParams.set("incidentId", incidentId);
  if (serviceId) queryParams.set("serviceId", serviceId);
  if (level) queryParams.set("level", level);
  queryParams.set("limit", String(limit));

  const { sendMessage } = useWebSocket<LogEntry[]>({
    url: `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/ws/logs?${queryParams.toString()}`,
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
