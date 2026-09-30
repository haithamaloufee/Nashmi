import { lookup } from "node:dns/promises";
import { isBlockedNetworkAddress } from "@/lib/remoteFetch";
import { validateNewsSourceUrlSyntax } from "@/lib/news/securityCore";
import type { SourceDefinition } from "@/lib/news/sourceRegistry";

export type SourceFetchMetrics = { requests: number; bytes: number; retries: number; cacheHits: number };
export async function fetchSourceDocument(url: string, source: SourceDefinition, maximum = 800_000, conditional: { etag?: string; lastModified?: string } = {}, metrics?: SourceFetchMetrics, attempt = 0): Promise<{ text: string; notModified: boolean; etag?: string; lastModified?: string }> {
  const target = new URL(url);
  if (target.hostname.toLowerCase().replace(/^www\./, "") !== source.host) throw new Error("NEWS_SOURCE_HOST_MISMATCH");
  validateNewsSourceUrlSyntax(url);
  const records = await lookup(target.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedNetworkAddress(record.address))) throw new Error("NEWS_SOURCE_DNS_UNTRUSTED");
  if (metrics && metrics.requests >= 25) throw new Error("NEWS_SOURCE_REQUEST_BUDGET_EXHAUSTED");
  if (metrics) metrics.requests += 1;
  const response = await fetch(url, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "NashmiNews/2.0 (+https://nashmi.haitham.website)", Accept: "text/html,application/xml,application/rss+xml,application/atom+xml", ...(conditional.etag ? { "If-None-Match": conditional.etag } : {}), ...(conditional.lastModified ? { "If-Modified-Since": conditional.lastModified } : {}) } });
  if (response.status === 304) {
    if (metrics) metrics.cacheHits += 1;
    return { text: "", notModified: true };
  }
  // Do not retry access denial or redirects. Respect overload with one bounded retry.
  if ([429, 502, 503, 504].includes(response.status) && attempt === 0) {
    const retryAfter = Number(response.headers.get("retry-after") || "1");
    await response.body?.cancel();
    if (retryAfter > 2 || !Number.isFinite(retryAfter)) throw new Error(`NEWS_SOURCE_HTTP_${response.status}`);
    if (metrics) metrics.retries += 1;
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
    return fetchSourceDocument(url, source, maximum, conditional, metrics, 1);
  }
  if (!response.ok || !response.body) throw new Error(`NEWS_SOURCE_HTTP_${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (metrics) metrics.bytes += value.byteLength;
      if (bytes > maximum) throw new Error("NEWS_SOURCE_TOO_LARGE");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks)), notModified: false, etag: response.headers.get("etag") || undefined, lastModified: response.headers.get("last-modified") || undefined };
}

export async function fetchSourceText(url: string, source: SourceDefinition, maximum = 800_000) {
  return (await fetchSourceDocument(url, source, maximum)).text;
}
