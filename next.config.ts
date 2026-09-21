import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "media.nashmi.haitham.website" },
      { protocol: "https", hostname: "parties.iec.jo", pathname: "/storage/**" }
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
