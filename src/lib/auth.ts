import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE } from "@/lib/cookies";
import { getJwtSecret } from "./env";
import { canMutateStatus, type Role } from "@/lib/permissions";
import User from "@/models/User";

function authSecret() {
  return new TextEncoder().encode(getJwtSecret());
}

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  image: string | null;
  bio: string | null;
  language: "ar" | "en";
};

export function safeUser(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
  status: string;
  image?: string | null;
  bio?: string | null;
  language?: "ar" | "en";
}): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    image: user.image || null,
    bio: user.bio || null,
    language: user.language || "ar"
  };
}

export async function signAuthToken(user: { _id: Types.ObjectId; role: Role }) {
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
  return { userId: payload.sub, role: payload.role as Role | undefined };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifyAuthToken(token);
    if (!payload?.userId) return null;
    await connectToDatabase();
    const user = await User.findById(payload.userId).select("-passwordHash").lean();
    if (!user) return null;
    return safeUser(user as never);
  } catch {
    return null;
  }
}

export async function requireUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireActiveUser(allowedRoles?: Role[]) {
  const user = await requireUser(allowedRoles);
  if (!canMutateStatus(user.status)) throw new Error("FORBIDDEN");
  return user;
}
