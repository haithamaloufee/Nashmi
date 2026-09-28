import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { signupSchema } from "@/lib/validators";
import { normalizeEmail, getClientIp, hashSensitive } from "@/lib/security";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJsonWithLimit, isDuplicateKeyError } from "@/lib/routeUtils";
import { safeUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";
import { createEmailVerificationToken } from "@/lib/authTokens";
import { buildSiteUrl } from "@/lib/siteUrl";
import { verificationEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const input = await readJsonWithLimit(request, signupSchema, 16 * 1024);
    const emailNormalized = normalizeEmail(input.email);
    const clientIp = getClientIp(request);
    // Never put a raw address in the MongoDB rate-limit key. A missing proxy
    // address must not collapse every signup into one global bucket.
    if (clientIp !== "unknown") {
      await requireRateLimit(`signup:ip:${hashSensitive(clientIp)}`, 30, 60 * 60 * 1000);
    }
    await requireRateLimit(`signup:email:${hashSensitive(emailNormalized)}`, 4, 60 * 60 * 1000);
    await connectToDatabase();

    const passwordHash = await bcrypt.hash(input.password, 12);
    const verification = createEmailVerificationToken();

    const user = await User.create({
      name: input.name,
      email: input.email.trim(),
      emailNormalized,
      emailVerified: false,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
      passwordHash,
      role: "citizen",
      provider: "credentials",
      status: "pending",
      language: input.language || "ar"
    });

    let emailSent = false;
    try {
      const delivery = await sendTransactionalEmail(user.email, verificationEmail(user.language, buildSiteUrl("/verify-email", { token: verification.token })));
      emailSent = delivery.sent;
    } catch {
      // The pending account remains recoverable through the resend endpoint.
    }
    const response = ok({ user: safeUser(user), verificationRequired: true, emailSent }, { status: 201 });
    await writeAuditLog({ actorUserId: user._id, actorRole: user.role, action: "auth.signup", targetType: "user", targetId: user._id, request });
    return response;
  } catch (error) {
    if (isDuplicateKeyError(error)) return fail("CONFLICT", "تعذر إنشاء الحساب بهذه البيانات. يمكنك تسجيل الدخول أو طلب إعادة إرسال التفعيل.", 409);
    return handleApiError(error);
  }
}
