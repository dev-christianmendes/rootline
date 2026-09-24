"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Investigation } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function useInvestigations() {
  return useQuery({
    queryKey: qk.investigations,
    queryFn: () => api.get<Investigation[]>("/investigations"),
  });
}

export function useInvestigation(investigationId: string) {
  return useQuery({
    queryKey: qk.investigation(investigationId),
    queryFn: () => api.get<Investigation>(`/investigations/${investigationId}`),
    enabled: Boolean(investigationId),
  });
}

/**
 * Loads an existing investigation for an incident (read-only). No analysis
 * is triggered here — that only happens through the explicit useAnalyze
 * mutation when the user presses "Run analysis".
 */
export function useInvestigationForIncident(incidentId: string) {
  return useQuery({
    queryKey: qk.investigationForIncident(incidentId),
    queryFn: () =>
      api
        .get<Investigation[]>(
          `/investigations?incidentId=${encodeURIComponent(incidentId)}`,
        )
        .then(
          (list) => list.find((inv) => inv.incidentId === incidentId) ?? null,
        ),
    enabled: Boolean(incidentId),
  });
}

/** Kicks off (or returns) the AI analysis pipeline for an incident. */
export function useAnalyze(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<Investigation>(`/incidents/${incidentId}/analyze`),
    onSuccess: (investigation) => {
      queryClient.setQueryData(
        qk.investigation(investigation.id),
        investigation,
      );
      queryClient.setQueryData(
        qk.investigationForIncident(incidentId),
        investigation,
      );
      queryClient.invalidateQueries({ queryKey: qk.investigations });
    },
  });
}
