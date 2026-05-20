import "server-only";

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getRateLimitSecret } from "@/lib/env";
import type { Language } from "@/lib/i18n";
import { getCurrentUser, type SafeUser } from "@/lib/auth";
import { canMutateStatus } from "@/lib/permissions";
import AssistantUsage from "@/models/AssistantUsage";

export const ASSISTANT_LIMITS = {
  guest: 15,
  user: 50
} as const;

export const ASSISTANT_MESSAGE_MAX_LENGTH = 1500;
export const ASSISTANT_HISTORY_MAX_ITEMS = 8;
export const ASSISTANT_HISTORY_MAX_CHARS = 1200;
export const ASSISTANT_BODY_MAX_BYTES = 16 * 1024;

type SubjectType = keyof typeof ASSISTANT_LIMITS;

export type AssistantUsageSnapshot = {
  subjectType: SubjectType;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

export async function getAssistantUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!canMutateStatus(user.status)) throw new Error("FORBIDDEN");
  return user;
}

function utcWindow(now = new Date()) {
  const dateKey = now.toISOString().slice(0, 10);
  const windowStart = new Date(`${dateKey}T00:00:00.000Z`);
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
  const expiresAt = new Date(windowEnd.getTime() + 60 * 24 * 60 * 60 * 1000);
  return { dateKey, windowStart, windowEnd, expiresAt };
}

function normalizeIp(value: string) {
  let ip = value.trim().toLowerCase();
  if (!ip) return "unknown";
  ip = ip.split(",")[0]?.trim() || "unknown";
  ip = ip.replace(/^\[/, "").replace(/\]$/, "");
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  return ip || "unknown";
}

function clientIp(request: Request) {
  const trustProxyHeaders = Boolean(process.env.VERCEL || process.env.TRUST_PROXY_HEADERS === "true" || process.env.NODE_ENV !== "production");
  if (!trustProxyHeaders) return "unknown";
  return normalizeIp(
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown"
  );
}

function hashGuestIp(ip: string) {
  return crypto.createHash("sha256").update(`${ip}:${getRateLimitSecret()}`).digest("hex");
}

function subjectFor(request: Request, user: SafeUser | null) {
  if (user) {
    return { subjectType: "user" as const, subjectKey: user.id };
  }
  return { subjectType: "guest" as const, subjectKey: hashGuestIp(clientIp(request)) };
}

function snapshot(subjectType: SubjectType, count: number, resetAt: Date): AssistantUsageSnapshot {
  const limit = ASSISTANT_LIMITS[subjectType];
  const used = Math.min(count, limit);
  return {
    subjectType,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: resetAt.toISOString()
  };
}

export async function getAssistantUsage(request: Request, user: SafeUser | null) {
  await connectToDatabase();
  const { subjectType, subjectKey } = subjectFor(request, user);
  const window = utcWindow();
  const doc = await AssistantUsage.findOne({ subjectType, subjectKey, dateKey: window.dateKey }).select("count").lean();
  return snapshot(subjectType, doc?.count || 0, window.windowEnd);
}

export async function consumeAssistantUsage(request: Request, user: SafeUser | null) {
  await connectToDatabase();
  const { subjectType, subjectKey } = subjectFor(request, user);
  const window = utcWindow();
  const limit = ASSISTANT_LIMITS[subjectType];
  const now = new Date();

  const updated = await AssistantUsage.findOneAndUpdate(
    { subjectType, subjectKey, dateKey: window.dateKey, count: { $lt: limit } },
    {
      $inc: { count: 1 },
      $set: { lastRequestAt: now, windowStart: window.windowStart, windowEnd: window.windowEnd, expiresAt: window.expiresAt },
      $setOnInsert: { subjectType, subjectKey, dateKey: window.dateKey }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).catch(async (error) => {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
      return AssistantUsage.findOneAndUpdate(
        { subjectType, subjectKey, dateKey: window.dateKey, count: { $lt: limit } },
        { $inc: { count: 1 }, $set: { lastRequestAt: now } },
        { new: true }
      );
    }
    throw error;
  });

  if (!updated) {
    const current = await AssistantUsage.findOne({ subjectType, subjectKey, dateKey: window.dateKey }).select("count").lean();
    return { ok: false as const, usage: snapshot(subjectType, current?.count || limit, window.windowEnd) };
  }

  return { ok: true as const, usage: snapshot(subjectType, updated.count || 0, window.windowEnd) };
}

export function assistantLimitMessage(subjectType: SubjectType, language: Language) {
  if (subjectType === "guest") {
    return language === "en"
      ? "You reached the free daily Smart Assistant limit. Log in to get a higher limit."
      : "وصلت إلى الحد اليومي المجاني للمساعد الذكي. سجّل دخولك للحصول على حد أعلى.";
  }
  return language === "en"
    ? "You reached your daily Smart Assistant limit. Please try again tomorrow."
    : "وصلت إلى الحد اليومي لاستخدام المساعد الذكي. حاول مرة أخرى غدًا.";
}

export function assistantLimitResponse(usage: AssistantUsageSnapshot, language: Language) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        messageKey: usage.subjectType === "guest" ? "chat.limit.guestReached" : "chat.limit.userReached",
        message: assistantLimitMessage(usage.subjectType, language),
        usage
      }
    },
    { status: 429 }
  );
}
