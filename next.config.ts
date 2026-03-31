import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // CRITICAL: Tells Next.js to build a minimal Docker-ready output
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Added for Phase 7 Fallback Hero Images
      },
    ],
  },
};

export default nextConfig;