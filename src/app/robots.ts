import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/account/", "/party-dashboard/", "/iec-dashboard/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
