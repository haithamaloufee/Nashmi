import { ok, handleApiError } from "@/lib/apiResponse";
import { connectToDatabase } from "@/lib/db";
import { emailRequestSchema } from "@/lib/validators";
import { readJsonWithLimit } from "@/lib/routeUtils";
import { normalizeEmail, getClientIp } from "@/lib/security";
import { requireRateLimit } from "@/lib/rateLimit";
import { createEmailVerificationToken } from "@/lib/authTokens";
import { buildSiteUrl } from "@/lib/siteUrl";
import { verificationEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";
import User from "@/models/User";

const message = "إذا كان الحساب موجودًا ويحتاج إلى التفعيل، فسيتم إرسال رسالة جديدة.";

export async function POST(request: Request) {
  try {
    await requireRateLimit(`verification-resend:${getClientIp(request)}`, 3, 60 * 60 * 1000);
    const input = await readJsonWithLimit(request, emailRequestSchema, 1024);
    await connectToDatabase();
    const user = await User.findOne({ emailNormalized: normalizeEmail(input.email), emailVerified: false });
    if (user) {
      const verification = createEmailVerificationToken();
      user.emailVerificationTokenHash = verification.tokenHash;
      user.emailVerificationExpiresAt = verification.expiresAt;
      await user.save();
      try { await sendTransactionalEmail(user.email, verificationEmail(user.language, buildSiteUrl("/verify-email", { token: verification.token }))); } catch { /* Retry remains available. */ }
    }
    return ok({ accepted: true, message });
  } catch (error) {
    return handleApiError(error);
  }
}
