import { SignJWT, jwtVerify } from "jose";
import type { Types } from "mongoose";

function authSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(user: { _id: string | Types.ObjectId; role: string }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, authSecret());
  if (!payload.sub) return null;
  return { userId: payload.sub, role: payload.role as string | undefined };
}