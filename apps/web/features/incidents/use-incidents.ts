"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Incident, IncidentStatus } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function useIncidents() {
  return useQuery({
    queryKey: qk.incidents,
    queryFn: () => api.get<Incident[]>("/incidents"),
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