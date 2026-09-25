interface Env {
  NASHMI_REFRESH_URL: string;
  NEWS_REFRESH_SECRET: string;
}

interface ScheduledEventController { cron: string; scheduledTime: number; }
interface WorkerExecutionContext { waitUntil(promise: Promise<unknown>): void; }

const encoder = new TextEncoder();
const FEEDS = {
  mamlaka: { url: "https://almamlakatv.com/rss.xml", marker: "<item>" },
  roya: { url: "https://royanews.tv/rss", marker: "<entry>" }
} as const;

async function publisherFeed(source: string | null) {
  const feed = FEEDS[source === "roya" ? "roya" : "mamlaka"];
  if (source && !(source in FEEDS)) return new Response("Unknown publisher", { status: 404 });
  try {
    const response = await fetch(feed.url, {
      headers: { "accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8", "user-agent": "Mozilla/5.0 (compatible; NashmiNews/1.0)" },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) return new Response("Publisher feed unavailable", { status: 502 });
    const body = await response.text();
    if (body.length > 250_000 || !body.includes(feed.marker)) return new Response("Invalid publisher feed", { status: 502 });
    return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=60" } });
  } catch { return new Response("Publisher feed unavailable", { status: 502 }); }
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signature(timestamp: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}\nPOST\n/api/internal/news/refresh`)));
}

async function refresh(env: Env) {
  if (!env.NEWS_REFRESH_SECRET || env.NEWS_REFRESH_SECRET.length < 32) throw new Error("NEWS_REFRESH_SECRET is not configured");
  const timestamp = String(Date.now());
  const response = await fetch(env.NASHMI_REFRESH_URL, {
    method: "POST",
    headers: {
      "x-nashmi-news-timestamp": timestamp,
      "x-nashmi-news-signature": await signature(timestamp, env.NEWS_REFRESH_SECRET),
      "user-agent": "Nashmi-Cloudflare-Cron/1.0"
    }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Nashmi refresh failed (${response.status}): ${body.slice(0, 300)}`);
  console.log(`Nashmi refresh success: ${body.slice(0, 300)}`);
  return body;
}

const worker = {
  async scheduled(_controller: ScheduledEventController, env: Env, ctx: WorkerExecutionContext) {
    ctx.waitUntil(refresh(env));
  },
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/feed" && request.method === "GET") return publisherFeed(url.searchParams.get("source"));
    if (url.pathname === "/health") return Response.json({ ok: true, service: "nashmi-news-refresh" });
    return new Response("Not found", { status: 404 });
  }
};

export default worker;
