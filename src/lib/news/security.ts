import "server-only";

import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedNetworkAddress } from "@/lib/remoteFetch";
import { getNewsConfig } from "@/lib/news/config";
import { signNewsRefreshWithSecret, validateNewsSourceUrlSyntax, verifyNewsRefreshSignatureWithSecret } from "@/lib/news/securityCore";
export { classifyNewsSource, validateNewsSourceUrlSyntax } from "@/lib/news/securityCore";

export function signNewsRefresh(timestamp: string, secret = getNewsConfig().refreshSecret) {
  return signNewsRefreshWithSecret(timestamp, secret);
}

export function verifyNewsRefreshSignature(request: Request, now = Date.now()) {
  return verifyNewsRefreshSignatureWithSecret(request, getNewsConfig().refreshSecret, now);
}

export async function assertPublicNewsSourceUrl(value: string) {
  const url = validateNewsSourceUrlSyntax(value);
  if (!isIP(url.hostname)) {
    const records = await lookup(url.hostname, { all: true, verbatim: true });
    if (!records.length || records.some((record) => isBlockedNetworkAddress(record.address))) {
      throw new Error("NEWS_SOURCE_URL_UNTRUSTED");
    }
  }
  return url;
}

export async function resolveGroundedSourceUrl(value: string) {
  let current = value;
  for (let hop = 0; hop < 4; hop += 1) {
    const url = await assertPublicNewsSourceUrl(current);
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
      headers: { "User-Agent": "Nashmi-News-Validator/1.0" }
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
        headers: { "User-Agent": "Nashmi-News-Validator/1.0", Range: "bytes=0-0" }
      });
      await response.body?.cancel();
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) return url.toString();
    const location = response.headers.get("location");
    if (!location) throw new Error("NEWS_SOURCE_REDIRECT_INVALID");
    current = new URL(location, url).toString();
  }
  throw new Error("NEWS_SOURCE_REDIRECT_LIMIT");
}

export function newRefreshToken() {
  return randomUUID();
}
