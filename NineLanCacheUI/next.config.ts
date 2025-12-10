import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "steamdb.info",
      },
    ],
    // Disable optimized images in production Docker environment to avoid
    // "url parameter is not allowed" error when behind nginx proxy
    unoptimized: true,
  },
};

export default nextConfig;
