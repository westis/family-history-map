import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/family-history-map",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
