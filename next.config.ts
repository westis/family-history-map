import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enable static exports
  basePath: "/family-history-map", // Replace with your repository name
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
