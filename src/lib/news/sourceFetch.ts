import { lookup } from "node:dns/promises";
import { isBlockedNetworkAddress } from "@/lib/remoteFetch";
import { validateNewsSourceUrlSyntax } from "@/lib/news/securityCore";
import type { SourceDefinition } from "@/lib/news/sourceRegistry";

export async function fetchSourceText(url: string, source: SourceDefinition, maximum = 800_000) {
  const target = new URL(url);
  if (target.hostname.toLowerCase().replace(/^www\./, "") !== source.host) throw new Error("NEWS_SOURCE_HOST_MISMATCH");
  validateNewsSourceUrlSyntax(url);
  const records = await lookup(target.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedNetworkAddress(record.address))) throw new Error("NEWS_SOURCE_DNS_UNTRUSTED");
  const response = await fetch(url, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "NashmiNews/2.0 (+https://nashmi.haitham.website)", Accept: "text/html,application/xml,application/rss+xml,application/atom+xml" } });
  if (!response.ok || !response.body) throw new Error(`NEWS_SOURCE_HTTP_${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) throw new Error("NEWS_SOURCE_TOO_LARGE");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}
