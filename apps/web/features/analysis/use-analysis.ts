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

export function useAnalyze(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<Investigation>(`/incidents/${incidentId}/analyze`),
    onSuccess: (investigation) => {
      queryClient.setQueryData(qk.analysis(incidentId), investigation);
      queryClient.setQueryData(qk.investigation(investigation.id), investigation);
    },
  });
}

/**
 * Runs the analysis pipeline for an incident on mount. The current mock API
 * responds from deterministic datasets with a short artificial delay, which
 * mirrors the future backend behavior and makes the investigation UX visible.
 */
export function useAnalysisQuery(incidentId: string) {
  return useQuery({
    queryKey: qk.analysis(incidentId),
    queryFn: () => api.post<Investigation>(`/incidents/${incidentId}/analyze`),
    enabled: Boolean(incidentId),
    retry: false,
    staleTime: Infinity,
  });
}

/** Returns the last stored analysis result, if any. */
export function useAnalysisCache(incidentId: string): Investigation | undefined {
  return useQueryClient().getQueryData<Investigation>(qk.analysis(incidentId));
}