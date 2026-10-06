import type { Incident, Service, Deployment } from "@rootline/types";

/**
 * Type for paginated API responses
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

/**
 * Extract items from a paginated response or array (for backward compatibility)
 */
export function getItems<T>(
  data: { items: T[]; total: number } | T[] | undefined,
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

/**
 * Extract total count from a paginated response
 */
export function getTotal(
  data: { items: unknown[]; total: number } | unknown[] | undefined,
): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  return data.total ?? 0;
}

/**
 * Type guards for checking response format
 */
export function isPaginatedResponse<T>(
  data: unknown,
): data is { items: T[]; total: number } {
  return (
    typeof data === "object" &&
    data !== null &&
    "items" in data &&
    "total" in data &&
    Array.isArray((data as { items: unknown[] }).items)
  );
}

/**
 * Hook to get items from paginated response
 */
export function usePaginatedItems<T>(
  data: { items: T[]; total: number } | T[] | undefined,
): T[] {
  return getItems(data);
}

/**
 * Hook to get total count from paginated response
 */
export function usePaginatedTotal(
  data: { items: unknown[]; total: number } | unknown[] | undefined,
): number {
  return getTotal(data);
}
