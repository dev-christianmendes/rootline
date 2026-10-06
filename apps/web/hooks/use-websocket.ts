"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface WebSocketMessage<T = unknown> {
  type: string;
  data?: T;
}

interface UseWebSocketOptions<T> {
  url: string;
  onMessage?: (message: WebSocketMessage<T>) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn<T> {
  sendMessage: (message: WebSocketMessage) => void;
  isConnected: boolean;
  lastMessage: WebSocketMessage<T> | null;
  error: Event | null;
}

export function useWebSocket<T = unknown>({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
}: UseWebSocketOptions<T>): UseWebSocketReturn<T> {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(
    null,
  );
  const [error, setError] = useState<Event | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage<T> = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();

        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (err) => {
        setError(err);
        onError?.(err);
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError(err as Event);
    }
  }, [
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, message not sent:", message);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    sendMessage,
    isConnected,
    lastMessage,
    error,
  };
}
