import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

let assetPrefix = "";
let basePath = "";

if (isGithubActions) {
  const repo = process.env.GITHUB_REPOSITORY?.replace(/.*?\//, "");
  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: assetPrefix,
  basePath: basePath,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      use: ["json-loader"],
      type: "javascript/auto",
    });
    return config;
  },
};

export default nextConfig;
