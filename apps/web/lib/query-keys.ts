export const qk = {
  services: ["services"] as const,
  service: (id: string) => ["services", id] as const,
  serviceMetrics: (id: string) => ["services", id, "metrics"] as const,
  incidents: ["incidents"] as const,
  incident: (id: string) => ["incidents", id] as const,
  incidentLogs: (id: string) => ["incidents", id, "logs"] as const,
  incidentTraces: (id: string) => ["incidents", id, "traces"] as const,
  deployments: ["deployments"] as const,
  investigations: ["investigations"] as const,
  investigation: (id: string) => ["investigations", id] as const,
  analysis: (incidentId: string) => ["analysis", incidentId] as const,
  systemHealth: ["system", "health"] as const,
};