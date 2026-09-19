import { createHash, randomBytes } from "node:crypto";

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashAccountSetupToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createAccountSetup() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAccountSetupToken(token), expiresAt: new Date(Date.now() + SETUP_TOKEN_TTL_MS) };
}

export function buildAccountSetupUrl(token: string) {
  const fallback = process.env.NODE_ENV === "production" ? "https://nashmi.haitham.website" : "http://localhost:3000";
  const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || fallback);
  base.pathname = "/set-password";
  base.search = "";
  base.hash = "";
  base.searchParams.set("token", token);
  return base.toString();
}
