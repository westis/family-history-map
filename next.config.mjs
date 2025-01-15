/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
