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
  const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004");
  base.pathname = "/set-password";
  base.search = "";
  base.hash = "";
  base.searchParams.set("token", token);
  return base.toString();
}
