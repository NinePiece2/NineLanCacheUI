import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.cloudflare.steamstatic.com',
        pathname: '/steam/apps/**',
      },
      {
        protocol: 'https',
        hostname: 'steamdb.info',
        pathname: '/static/img/**',
      },
    ],
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 184, 256, 384],
    minimumCacheTTL: 86400, // Cache for 24 hours
    dangerouslyAllowSVG: true, // Allow SVG fallback images
    contentDispositionType: 'inline',
  },
  // Ensure proper handling in production
  output: 'standalone',
};

export default nextConfig;
