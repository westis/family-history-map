import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/family-history-map",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_MAPTILER_KEY: process.env.NEXT_PUBLIC_MAPTILER_KEY,
  },
};

export default nextConfig;
