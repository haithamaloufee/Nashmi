import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const VERCEL_BLOB_SUFFIX = ".public.blob.vercel-storage.com";
const MAGIC_BYTES_LIMIT = 64;
const FETCH_TIMEOUT_MS = 5_000;

function parseIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
}

export function isBlockedNetworkAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parts = parseIpv4(address);
    if (!parts) return true;
    const [a, b, c] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (family === 6) {
    const normalized = address.toLowerCase().split("%")[0];
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized)) return true;
    if (normalized.startsWith("ff")) return true;
    if (normalized.startsWith("2001:db8:")) return true;
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);
      return isIP(mapped) === 4 ? isBlockedNetworkAddress(mapped) : true;
    }
    return false;
  }

  return true;
}

export function validateVercelBlobUrl(value: string, expectedStorageKey: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("UNTRUSTED_REMOTE_URL");
  }

  const hostname = url.hostname.toLowerCase();
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("UNTRUSTED_REMOTE_URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !hostname.endsWith(VERCEL_BLOB_SUFFIX) ||
    hostname.length <= VERCEL_BLOB_SUFFIX.length ||
    decodedPath !== expectedStorageKey
  ) {
    throw new Error("UNTRUSTED_REMOTE_URL");
  }
  return url;
}

async function assertPublicDns(hostname: string) {
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedNetworkAddress(record.address))) {
    throw new Error("UNTRUSTED_REMOTE_URL");
  }
}

export async function readTrustedBlobMagic(value: string, expectedStorageKey: string, expectedContentType: string) {
  const url = validateVercelBlobUrl(value, expectedStorageKey);
  await assertPublicDns(url.hostname);

  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Range: `bytes=0-${MAGIC_BYTES_LIMIT - 1}` }
  });
  if (response.status < 200 || response.status >= 300) return null;
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType && contentType !== expectedContentType.toLowerCase()) return null;

  const advertisedLength = Number(response.headers.get("content-length") || "0");
  if (advertisedLength > MAGIC_BYTES_LIMIT) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > MAGIC_BYTES_LIMIT) return null;
      chunks.push(chunk);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size);
}
