import { createHash, randomBytes } from "node:crypto";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createToken(ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAuthToken(token), expiresAt: new Date(Date.now() + ttlMs) };
}

export function createEmailVerificationToken() {
  return createToken(VERIFICATION_TTL_MS);
}

export function createPasswordResetToken() {
  return createToken(RESET_TTL_MS);
}
