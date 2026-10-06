"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";

interface WebSocketContextValue {
  isIncidentConnected: (incidentId: string) => boolean;
  isMetricsConnected: (serviceId: string) => boolean;
  isLogsConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  // This is a placeholder - actual connections are managed by individual components
  // using the useWebSocket hook directly
  const incidentConnections = useRef<Set<string>>(new Set());
  const metricsConnections = useRef<Set<string>>(new Set());
  const logsConnected = false; // Placeholder

  const isIncidentConnected = useCallback((incidentId: string) => {
    return incidentConnections.current.has(incidentId);
  }, []);

  const isMetricsConnected = useCallback((serviceId: string) => {
    return metricsConnections.current.has(serviceId);
  }, []);

  const value: WebSocketContextValue = {
    isIncidentConnected,
    isMetricsConnected,
    isLogsConnected: logsConnected,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
}
