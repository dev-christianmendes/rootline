"use client";

import { useQuery } from "@tanstack/react-query";
import type { Deployment } from "@rootline/types";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function useDeployments() {
  return useQuery({
    queryKey: qk.deployments,
    queryFn: () => api.get<Deployment[]>("/deployments"),
  });
}