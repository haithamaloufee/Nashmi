import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { signupSchema } from "@/lib/validators";
import { normalizeEmail, getClientIp } from "@/lib/security";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson, isDuplicateKeyError } from "@/lib/routeUtils";
import { safeUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";
import { createEmailVerificationToken } from "@/lib/authTokens";
import { buildSiteUrl } from "@/lib/siteUrl";
import { verificationEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    await requireRateLimit(`signup:${getClientIp(request)}`, 3, 60 * 60 * 1000);
    const input = await readJson(request, signupSchema);
    await connectToDatabase();

    const emailNormalized = normalizeEmail(input.email);
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
