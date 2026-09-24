import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rootline/ui", "@rootline/types"],
};

export default nextConfig;