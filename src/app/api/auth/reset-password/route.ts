import bcrypt from "bcryptjs";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";
import { passwordResetSchema } from "@/lib/validators";
import { readJsonWithLimit } from "@/lib/routeUtils";
import { hashAuthToken } from "@/lib/authTokens";
import { connectToDatabase } from "@/lib/db";
import { passwordChangedEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await requireRateLimit(`password-reset:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    const input = await readJsonWithLimit(request, passwordResetSchema, 2048);
    await connectToDatabase();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: hashAuthToken(input.token),
        passwordResetExpiresAt: { $gt: new Date() }
      },
      [
        {
          $set: {
            passwordHash,
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
            failedLoginCount: 0,
            lockedUntil: null,
            requiresPasswordReset: false,
            passwordChangedAt: "$$NOW",
            sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 0] }, 1] }
          }
        }
      ],
      { new: true }
    );
    if (!user) return fail("BAD_REQUEST", "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي أو مستخدم سابقًا", 400);
    try { await sendTransactionalEmail(user.email, passwordChangedEmail(user.language)); } catch { /* Password reset remains committed. */ }
    return ok({ completed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
