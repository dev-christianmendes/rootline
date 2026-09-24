/**
 * By default requests go to the same-origin `/api/v1` path, which Next.js
 * proxies to the Rootline API (see next.config.ts). Set NEXT_PUBLIC_API_URL to
 * call the API directly instead — the API allows CORS from the dev server, but
 * the proxy avoids it entirely.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    // A transport failure almost always means the API is not running, which is
    // worth saying outright instead of surfacing a bare "failed to fetch".
    throw new ApiError(
      0,
      "Cannot reach the Rootline API. Start it with `npm run infra:up` (or `docker compose -f apps/api/docker-compose.yml up -d`).",
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
};
