import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/family-history-map",
  images: {
    unoptimized: true,
  },
  distDir: "out",
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_MAPTILER_KEY: process.env.NEXT_PUBLIC_MAPTILER_KEY,
  },
  assetPrefix: "/family-history-map/",
  webpack: (config) => {
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    return config;
  },
};

export default nextConfig;
