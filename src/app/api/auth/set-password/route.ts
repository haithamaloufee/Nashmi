import bcrypt from "bcryptjs";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";
import { accountSetupSchema } from "@/lib/validators";
import { readJsonWithLimit } from "@/lib/routeUtils";
import { hashAccountSetupToken } from "@/lib/accountSetup";
import { connectToDatabase } from "@/lib/db";
import { passwordChangedEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await requireRateLimit(`account-setup:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    const input = await readJsonWithLimit(request, accountSetupSchema, 2048);
    await connectToDatabase();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.findOneAndUpdate(
      { passwordSetupTokenHash: hashAccountSetupToken(input.token), passwordSetupExpiresAt: { $gt: new Date() } },
      [{ $set: { passwordHash: { $literal: passwordHash }, status: { $ifNull: ["$passwordSetupTargetStatus", "active"] }, emailVerified: true, passwordSetupTokenHash: null, passwordSetupExpiresAt: null, passwordSetupTargetStatus: null, failedLoginCount: 0, lockedUntil: null, requiresPasswordReset: false, passwordChangedAt: "$$NOW", sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 0] }, 1] } } }],
      { new: true }
    );
    if (!user) return fail("BAD_REQUEST", "رابط إعداد الحساب غير صالح أو منتهي أو مستخدم سابقًا", 400);
    try { await sendTransactionalEmail(user.email, passwordChangedEmail(user.language)); } catch { /* Account setup remains committed. */ }
    return ok({ completed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
