"use client";

import { useQuery } from "@tanstack/react-query";
import type { LogEntry, Trace } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function useIncidentLogs(incidentId: string) {
  return useQuery({
    queryKey: qk.incidentLogs(incidentId),
    queryFn: () => api.get<LogEntry[]>(`/incidents/${incidentId}/logs`),
    enabled: Boolean(incidentId),
  });
}

export function useIncidentTraces(incidentId: string) {
  return useQuery({
    queryKey: qk.incidentTraces(incidentId),
    queryFn: () => api.get<Trace[]>(`/incidents/${incidentId}/traces`),
    enabled: Boolean(incidentId),
  });
}