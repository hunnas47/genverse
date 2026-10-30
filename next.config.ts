import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next blocks dev-only assets from origins other than localhost. Add the LAN
  // address used for phone testing; update it if the network changes.
  allowedDevOrigins: ["192.168.68.118"],
  devIndicators: false,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
