import { SignJWT, jwtVerify } from "jose";
import type { Types } from "mongoose";

function authSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
}

export type AuthTokenPayload = {
  userId: string;
  role?: string;
  sessionVersion: number;
};

export function sessionVersionMatches(tokenVersion: number, userVersion: number | null | undefined) {
  return tokenVersion === Math.max(0, userVersion || 0);
}

export async function signAuthToken(user: { _id: string | Types.ObjectId; role: string; sessionVersion?: number | null }) {
  return new SignJWT({ role: user.role, sv: Math.max(0, user.sessionVersion || 0) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, authSecret());
  if (!payload.sub) return null;
  return {
    userId: payload.sub,
    role: payload.role as string | undefined,
    // Tokens issued before session-version support are version zero. This avoids
    // a forced global logout while still allowing any password reset to revoke them.
    sessionVersion: typeof payload.sv === "number" ? Math.max(0, payload.sv) : 0
  } satisfies AuthTokenPayload;
}
