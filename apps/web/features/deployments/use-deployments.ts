"use client";

import { useQuery } from "@tanstack/react-query";
import type { Deployment } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export interface UseDeploymentsParams {
  offset?: number;
  limit?: number;
}

export function useDeployments(params: UseDeploymentsParams = {}) {
  const { offset = 0, limit = 50 } = params;

  return useQuery({
    queryKey: [...qk.deployments, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (offset) searchParams.set("offset", String(offset));
      if (limit) searchParams.set("limit", String(limit));
      return api.get<{ items: Deployment[]; total: number }>(
        `/deployments?${searchParams.toString()}`,
      );
    },
  });
}
