import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large volunteer photo uploads (phone camera HEIC/JPEG)
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
