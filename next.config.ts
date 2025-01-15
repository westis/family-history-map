import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enable static exports
  basePath: "/family-history-map", // Replace with your repository name
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
