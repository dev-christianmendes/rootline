"use client";

import { useQuery } from "@tanstack/react-query";
import type { MetricSeries, Service, SystemHealth } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function useServices() {
  return useQuery({
    queryKey: qk.services,
    queryFn: () => api.get<Service[]>("/services"),
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: qk.service(id),
    queryFn: () => api.get<Service>(`/services/${id}`),
    enabled: Boolean(id),
  });
}

export function useServiceMetrics(id: string, metric?: string) {
  return useQuery({
    queryKey: [...qk.serviceMetrics(id), metric].filter(Boolean),
    queryFn: () =>
      api.get<MetricSeries[]>(
        `/services/${id}/metrics${metric ? `?metric=${metric}` : ""}`,
      ),
    enabled: Boolean(id),
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: qk.systemHealth,
    queryFn: () => api.get<SystemHealth>("/system/health"),
  });
}