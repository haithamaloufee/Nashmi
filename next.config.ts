import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" }
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb"
    }
  }
};

export default nextConfig;
