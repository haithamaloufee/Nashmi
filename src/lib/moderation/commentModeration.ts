import { createHmac } from "node:crypto";
import { z } from "zod";
import { normalizeArabic } from "@/lib/arabicSearch";

export const moderationDecisionSchema = z.object({
  decision: z.enum(["ALLOW", "REJECT"]),
  category: z.enum(["NONE", "HARASSMENT", "HATE", "THREAT", "INCITEMENT", "SEVERE_ABUSE"]),
  confidence: z.number().min(0).max(1),
  reasonCode: z.string().max(40).regex(/^[A-Z0-9_]+$/)
}).strict();

export type ModerationDecision = z.infer<typeof moderationDecisionSchema>;
export const REJECTION_MESSAGE = "ما قدرنا ننشر التعليق بصيغته الحالية. نرحب بالاختلاف والنقد، لكن يبدو أن الصياغة تحتوي على إساءة أو محتوى قد يضر بنقاش محترم. عدّل الصياغة وحاول مرة ثانية.";

// This representation is only for detecting duplicates. The displayed text is never changed.
export function normalizeCommentForComparison(content: string) {
  return normalizeArabic(content.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "")).trim();
}

export function duplicateKey(userId: string, content: string, secret: string) {
  return `comment-duplicate:${userId}:${createHmac("sha256", secret).update(normalizeCommentForComparison(content)).digest("hex")}`;
}

export function obviousFlood(content: string) {
  const value = normalizeCommentForComparison(content);
  if (!value) return true;
  // Only reject extreme repetition, not emphatic ordinary spelling.
  return /(.)\1{19,}/u.test(value) || /^(\S{1,5}\s*)\1{9,}$/u.test(value);
}

export function decideModeration(raw: unknown): { allowed: boolean; category: ModerationDecision["category"]; reasonCode: string } {
  const parsed = moderationDecisionSchema.safeParse(raw);
  if (!parsed.success) return { allowed: true, category: "NONE", reasonCode: "INVALID_AI_OUTPUT" };
  const decision = parsed.data;
  if (decision.decision === "REJECT" && decision.category !== "NONE" && decision.confidence >= 0.9) {
    return { allowed: false, category: decision.category, reasonCode: decision.reasonCode };
  }
  return { allowed: true, category: "NONE", reasonCode: "ALLOW" };
}
