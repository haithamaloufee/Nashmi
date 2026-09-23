import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { isBlockedNetworkAddress } from "@/lib/remoteFetch";

export const NEWS_SIGNATURE_HEADER = "x-nashmi-news-signature";
export const NEWS_TIMESTAMP_HEADER = "x-nashmi-news-timestamp";
export const NEWS_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

export function newsSignaturePayload(timestamp: string) {
  return `${timestamp}\nPOST\n/api/internal/news/refresh`;
}

export function signNewsRefreshWithSecret(timestamp: string, secret: string) {
  return createHmac("sha256", secret).update(newsSignaturePayload(timestamp)).digest("hex");
}

export function verifyNewsRefreshSignatureWithSecret(request: Request, secret: string, now = Date.now()) {
  const timestamp = request.headers.get(NEWS_TIMESTAMP_HEADER)?.trim() || "";
  const supplied = request.headers.get(NEWS_SIGNATURE_HEADER)?.trim().toLowerCase() || "";
  const timestampMs = Number(timestamp);
  if (!/^\d{13}$/.test(timestamp) || !Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > NEWS_SIGNATURE_TOLERANCE_MS) throw new Error("NEWS_SIGNATURE_EXPIRED");
  if (!/^[a-f0-9]{64}$/.test(supplied)) throw new Error("NEWS_SIGNATURE_INVALID");
  const expected = signNewsRefreshWithSecret(timestamp, secret);
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) throw new Error("NEWS_SIGNATURE_INVALID");
  return { timestamp, signatureHash: createHash("sha256").update(`${timestamp}:${supplied}`).digest("hex") };
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata", "instance-data", "169.254.169.254"]);

export function validateNewsSourceUrlSyntax(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("NEWS_SOURCE_URL_INVALID"); }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("NEWS_SOURCE_URL_UNTRUSTED");
  }
  if (isIP(hostname) && isBlockedNetworkAddress(hostname)) throw new Error("NEWS_SOURCE_URL_UNTRUSTED");
  return url;
}

export function classifyNewsSource(value: string): "official" | "news_agency" | "reputable_media" | null {
  const hostname = validateNewsSourceUrlSyntax(value).hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "petra.gov.jo") return "news_agency";
  if (hostname.endsWith(".gov.jo") || ["gov.jo", "pm.gov.jo", "parliament.jo", "senate.jo", "representatives.jo", "iec.jo", "parties.iec.jo", "ammancity.gov.jo", "rhc.jo"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return "official";
  if (["almamlaka.tv", "alghad.com", "royanews.tv", "alrai.com", "addustour.com", "jordantimes.com", "jordannews.jo"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return "reputable_media";
  return null;
}
