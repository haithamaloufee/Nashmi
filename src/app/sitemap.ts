import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const routes = ["", "/about-nashmi", "/parties", "/iec", "/updates", "/laws", "/surveys", "/login", "/signup", "/forgot-password"];
  return routes.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" || path === "/updates" ? "daily" : "weekly", priority: path === "" ? 1 : 0.7 }));
}
