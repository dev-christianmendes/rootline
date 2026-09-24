import type { NextConfig } from "next";

/**
 * Origin of the Rootline API (FastAPI). The browser always talks to the
 * same-origin `/api/v1` path, and Next proxies it server side, which keeps
 * CORS out of the picture in every environment.
 *
 * Override with ROOTLINE_API_URL when the API runs elsewhere, e.g.
 * ROOTLINE_API_URL=http://localhost:8080 npm run dev
 */
const apiOrigin = process.env.ROOTLINE_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  transpilePackages: ["@rootline/ui", "@rootline/types"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
