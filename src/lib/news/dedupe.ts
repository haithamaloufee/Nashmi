import { createHash } from "node:crypto";
import { normalizeArabic } from "@/lib/arabicSearch";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizedExactNewsTitle(value: string) {
  return normalizeArabic(value);
}

export function sourceUrlHash(value: string) {
  const url = new URL(value);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => url.searchParams.delete(key));
  url.searchParams.sort();
  return sha256(url.toString().replace(/\/$/, ""));
}

export function dedupeExactFeedItems<T extends { title: string; url: string }>(items: T[]) {
  const urls = new Set<string>();
  const titles = new Set<string>();
  return items.filter((item) => {
    const url = sourceUrlHash(item.url);
    const title = normalizedExactNewsTitle(item.title);
    if (urls.has(url) || titles.has(title)) return false;
    urls.add(url);
    titles.add(title);
    return true;
  });
}
