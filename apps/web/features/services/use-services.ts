"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { MetricSeries, Service, SystemHealth } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export interface UseServicesParams {
  offset?: number;
  limit?: number;
}

export function useServices(params: UseServicesParams = {}) {
  const { offset = 0, limit = 50 } = params;

  return useQuery({
    queryKey: [...qk.services, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (offset) searchParams.set("offset", String(offset));
      if (limit) searchParams.set("limit", String(limit));
      return api.get<{ items: Service[]; total: number }>(
        `/services?${searchParams.toString()}`,
      );
    },
  });
}

/** Memoized id -> Service map, avoids O(n) finds across many components. */
export function useServicesMap(
  params: UseServicesParams = {},
): Map<string, Service> {
  const services = useServices(params);
  return React.useMemo(
    () => new Map((services.data?.items ?? []).map((s) => [s.id, s])),
    [services.data?.items],
  );
}

/** Returns a stable (id: string) => name resolver backed by the services map. */
export function useServiceNames(
  params: UseServicesParams = {},
): (id: string) => string {
  const services = useServicesMap(params);
  return React.useCallback(
    (id: string) => services.get(id)?.name ?? id,
    [services],
  );
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
