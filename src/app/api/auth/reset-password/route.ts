import bcrypt from "bcryptjs";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";
import { accountSetupSchema } from "@/lib/validators";
import { readJsonWithLimit } from "@/lib/routeUtils";
import { hashAccountSetupToken } from "@/lib/accountSetup";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await requireRateLimit(`password-reset:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    const input = await readJsonWithLimit(request, accountSetupSchema, 2048);
    await connectToDatabase();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.findOneAndUpdate(
      {
        passwordSetupTokenHash: hashAccountSetupToken(input.token),
        passwordSetupExpiresAt: { $gt: new Date() }
      },
      [
        {
          $set: {
            passwordHash,
            status: { $ifNull: ["$passwordSetupTargetStatus", "active"] },
            passwordSetupTokenHash: null,
            passwordSetupExpiresAt: null,
            passwordSetupTargetStatus: null,
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
    if (!user) return fail("BAD_REQUEST", "رابط إعداد كلمة المرور غير صالح أو منتهي", 400);
    return ok({ completed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
