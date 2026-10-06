"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Incident, IncidentStatus, Severity } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export interface UseIncidentsParams {
  offset?: number;
  limit?: number;
  severity?: Severity;
  status?: IncidentStatus;
  q?: string;
}

export function useIncidents(params: UseIncidentsParams = {}) {
  const { offset = 0, limit = 50, severity, status, q } = params;

  return useQuery({
    queryKey: [...qk.incidents, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (offset) searchParams.set("offset", String(offset));
      if (limit) searchParams.set("limit", String(limit));
      if (severity) searchParams.set("severity", severity);
      if (status) searchParams.set("status", status);
      if (q) searchParams.set("q", q);
      return api.get<{ items: Incident[]; total: number }>(
        `/incidents?${searchParams.toString()}`,
      );
    },
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: qk.incident(id),
    queryFn: () => api.get<Incident>(`/incidents/${id}`),
    enabled: Boolean(id),
  });
}

export interface PatchIncidentInput {
  status?: IncidentStatus;
  assignee?: string;
  title?: string;
  severity?: Incident["severity"];
  resolution?: {
    rootCause?: string;
    summary?: string;
    mitigation?: string;
    resolvedBy?: string;
  };
}

export function useMutationIncident(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PatchIncidentInput) =>
      api.patch<Incident>(`/incidents/${id}`, input),
    onSuccess: (incident) => {
      queryClient.setQueryData(qk.incident(id), incident);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["system"] });
    },
  });
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity?: Incident["severity"];
  serviceId?: string;
  assignee?: string;
  impact?: string;
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateIncidentInput) =>
      api.post<Incident>("/incidents", input),
    onSuccess: (incident) => {
      queryClient.setQueryData(qk.incident(incident.id), incident);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["system"] });
    },
  });
}
