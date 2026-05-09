import { isValidObjectId } from "mongoose";
import User from "@/models/User";

type LeanUser = {
  _id?: unknown;
  id?: string;
  name?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  bio?: string | null;
  createdAt?: Date | string | null;
};

export type PublicUserSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string | null;
  href: string;
};

export type PublicUserProfile = PublicUserSummary & {
  bio: string | null;
  joinedAt: string | null;
};

export function publicUserSummary(user: LeanUser | null | undefined): PublicUserSummary | null {
  if (!user) return null;
  const id = String(user._id || user.id || "");
  if (!id) return null;
  const name = (user.name || "").trim() || "مستخدم نشمي";
  return {
    id,
    name,
    avatarUrl: user.avatarUrl || user.image || null,
    role: user.role || null,
    href: `/users/${id}`
  };
}

export function publicUserProfile(user: LeanUser | null | undefined): PublicUserProfile | null {
  const summary = publicUserSummary(user);
  if (!summary) return null;
  return {
    ...summary,
    bio: user?.bio || null,
    joinedAt: user?.createdAt ? new Date(user.createdAt).toISOString() : null
  };
}

export async function getPublicUserProfile(userId: string) {
  if (!isValidObjectId(userId)) return { status: 400 as const, user: null };
  const user = await User.findOne({ _id: userId, status: "active" })
    .select("name avatarUrl image role bio createdAt")
    .lean();
  if (!user) return { status: 404 as const, user: null };
  return { status: 200 as const, user: publicUserProfile(user as LeanUser) };
}
