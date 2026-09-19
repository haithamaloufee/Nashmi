import { ok, handleApiError } from "@/lib/apiResponse";
import { requireRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";
import { normalizeEmail } from "@/lib/security";
import { emailRequestSchema } from "@/lib/validators";
import { readJsonWithLimit } from "@/lib/routeUtils";
import { connectToDatabase } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/authTokens";
import { buildSiteUrl } from "@/lib/siteUrl";
import { passwordResetEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await requireRateLimit(`password-reset-request:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    const input = await readJsonWithLimit(request, emailRequestSchema, 1024);
    await connectToDatabase();
    const user = await User.findOne({ emailNormalized: normalizeEmail(input.email), status: { $ne: "disabled" } });
    if (user) {
      const reset = createPasswordResetToken();
      user.passwordResetTokenHash = reset.tokenHash;
      user.passwordResetExpiresAt = reset.expiresAt;
      await user.save();
      try { await sendTransactionalEmail(user.email, passwordResetEmail(user.language, buildSiteUrl("/reset-password", { token: reset.token }))); } catch { /* Generic response prevents enumeration. */ }
    }
    return ok({
      accepted: true,
      message: "إذا كان هناك حساب مرتبط بهذا البريد، فقد أرسلنا تعليمات إعادة تعيين كلمة المرور."
    });
  } catch (error) {
    return handleApiError(error);
  }
}
