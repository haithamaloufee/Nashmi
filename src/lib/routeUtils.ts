import type { ZodSchema } from "zod";
import type { SafeUser } from "@/lib/auth";
import { assertNoDangerousKeys, stripHtml } from "@/lib/security";
import { isAdmin } from "@/lib/permissions";
import Party from "@/models/Party";

export async function readJson<T>(request: Request, schema: ZodSchema<T>) {
  const body = await request.json().catch(() => ({}));
  assertNoDangerousKeys(body);
  return schema.parse(body);
}

export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export async function getPartyForUser(userId: string) {
  return Party.findOne({ accountUserId: userId, status: { $ne: "disabled" } });
}

export async function requirePartyForUser(userId: string) {
  const party = await getPartyForUser(userId);
  if (!party) throw new Error("FORBIDDEN");
  return party;
}

export function canEditOwnedContent(user: SafeUser, doc: { authorUserId?: unknown }) {
  return isAdmin(user.role) || String(doc.authorUserId) === user.id;
}

export function cleanContent(input: string) {
  return stripHtml(input).slice(0, 6000);
}

export function pollResultsDisclaimer() {
  return "نتائج التصويتات تعبر عن مستخدمي المنصة وليست استطلاعًا علميًا.";
}

export function lawDisclaimer() {
  return "شرح القوانين للتوعية العامة وليس استشارة قانونية رسمية.";
}
