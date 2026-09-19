const PRODUCTION_SITE_URL = "https://nashmi.haitham.website";

export function getSiteUrl() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : "http://localhost:3000";
  const url = new URL(configured || fallback);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function buildSiteUrl(pathname: string, params: Record<string, string> = {}) {
  const url = new URL(pathname, `${getSiteUrl()}/`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export { PRODUCTION_SITE_URL };
