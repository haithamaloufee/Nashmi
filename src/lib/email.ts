import "server-only";
import { createHash } from "node:crypto";
import { getOptionalEnv } from "@/lib/env";
import type { EmailTemplate } from "@/lib/emailTemplates";

type SendResult = { sent: boolean; id?: string; skipped?: string };

function recipientFingerprint(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 12);
}

function canSendTo(recipient: string) {
  if ((process.env.VERCEL_ENV || process.env.NODE_ENV) === "production") return true;
  const allowlist = (getOptionalEnv("EMAIL_ALLOWED_RECIPIENTS") || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(recipient.trim().toLowerCase());
}

export async function sendTransactionalEmail(to: string, template: EmailTemplate): Promise<SendResult> {
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("email_skipped", { reason: "provider_not_configured", recipient: recipientFingerprint(to) });
    return { sent: false, skipped: "provider_not_configured" };
  }
  if (!canSendTo(to)) {
    console.info("email_skipped", { reason: "recipient_not_allowlisted", recipient: recipientFingerprint(to) });
    return { sent: false, skipped: "recipient_not_allowlisted" };
  }

  const from = getOptionalEnv("EMAIL_FROM") || "Nashmi <no-reply@auth.nashmi.haitham.website>";
  const replyTo = getOptionalEnv("EMAIL_REPLY_TO");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: template.subject, html: template.html, text: template.text, ...(replyTo ? { reply_to: replyTo } : {}) })
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok) {
    console.error("email_failed", { status: response.status, providerError: payload.name || "unknown", recipient: recipientFingerprint(to) });
    throw new Error("Transactional email delivery failed");
  }
  console.info("email_sent", { id: payload.id, recipient: recipientFingerprint(to) });
  return { sent: true, id: payload.id };
}
