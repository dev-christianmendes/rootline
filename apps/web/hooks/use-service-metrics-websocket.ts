"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { MetricSeries } from "@rootline/types";

interface UseServiceMetricsWebSocketOptions {
  serviceId: string;
  metric?: string;
  onMetricsUpdate?: (metrics: MetricSeries[]) => void;
  enabled?: boolean;
}

interface UseServiceMetricsWebSocketReturn {
  isConnected: boolean;
  lastUpdate: MetricSeries[] | null;
  error: Event | null;
}

export function useServiceMetricsWebSocket({
  serviceId,
  metric,
  onMetricsUpdate,
  enabled = true,
}: UseServiceMetricsWebSocketOptions): UseServiceMetricsWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<MetricSeries[] | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const onMetricsUpdateRef = useRef(onMetricsUpdate);

  onMetricsUpdateRef.current = onMetricsUpdate;

  const handleMessage = useCallback(
    (message: { type: string; data?: MetricSeries[] }) => {
      if (message.type === "metrics_update" && message.data) {
        setLastUpdate(message.data);
        onMetricsUpdateRef.current?.(message.data);
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
  if (metric) queryParams.set("metric", metric);

  const { sendMessage } = useWebSocket<MetricSeries[]>({
    url: `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/ws/services/${serviceId}/metrics?${queryParams.toString()}`,
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
