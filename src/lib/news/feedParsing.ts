import { classifyNewsSource } from "@/lib/news/securityCore";

export const FEEDS = [
  { id: "mamlaka", url: "https://almamlakatv.com/rss.xml", host: "almamlakatv.com", publisher: "قناة المملكة", format: "rss" },
  { id: "roya", url: "https://royanews.tv/rss", host: "royanews.tv", publisher: "رؤيا الإخباري", format: "atom" },
] as const;

export type FeedItem = { title: string; summary: string; url: string; publishedAt: string; publisher: string };

export function availableFeedLists(results: PromiseSettledResult<FeedItem[]>[]) {
  if (results.every((result) => result.status === "rejected")) throw new Error("NEWS_ALL_FEEDS_UNAVAILABLE");
  return results.map((result) => result.status === "fulfilled" ? result.value : []);
}

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function feedField(item: string, name: string) {
  return item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() || "";
}

export function parseFeed(xml: string, now: Date, feed: typeof FEEDS[number]) {
  const items: FeedItem[] = [];
  for (const match of xml.matchAll(feed.format === "atom" ? /<entry>([\s\S]*?)<\/entry>/gi : /<item>([\s\S]*?)<\/item>/gi)) {
    const raw = match[1];
    const title = cleanText(feedField(raw, "title"));
    const summary = cleanText(feed.format === "atom" ? feedField(raw, "summary") || feedField(raw, "content") : feedField(raw, "description"));
    const url = feed.format === "atom" ? raw.match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] || "" : feedField(raw, "link");
    const timestamp = Date.parse(feedField(raw, feed.format === "atom" ? "updated" : "pubDate"));
    if (title.length < 12 || summary.length < 20 || !Number.isFinite(timestamp)) continue;
    if (timestamp > now.getTime() + 10 * 60_000 || timestamp < now.getTime() - 7 * 24 * 60 * 60_000) continue;
    try {
      const parsedUrl = new URL(url);
      if (![feed.host, `www.${feed.host}`].includes(parsedUrl.hostname) || !/^\/news\/\d+-?$/.test(parsedUrl.pathname)) continue;
      if (classifyNewsSource(url) !== "reputable_media") continue;
    } catch { continue; }
    items.push({ title: title.slice(0, 180), summary: summary.slice(0, 900), url, publishedAt: new Date(timestamp).toISOString(), publisher: feed.publisher });
  }
  return items.slice(0, 25);
}
