import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enable static exports
  basePath: "/family-history-map", // Replace with your repository name
  images: {
    unoptimized: true,
  },
  distDir: "out",
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_LANTMATERIET_CONSUMER_KEY:
      process.env.NEXT_PUBLIC_LANTMATERIET_CONSUMER_KEY,
    NEXT_PUBLIC_LANTMATERIET_CONSUMER_SECRET:
      process.env.NEXT_PUBLIC_LANTMATERIET_CONSUMER_SECRET,
  },
};

export default nextConfig;
