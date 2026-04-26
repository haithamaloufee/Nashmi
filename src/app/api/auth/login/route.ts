import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { loginSchema } from "@/lib/validators";
import { normalizeEmail, getClientIp } from "@/lib/security";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/routeUtils";
import { safeUser, signAuthToken } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    requireRateLimit(`login:${getClientIp(request)}`, 5, LOCK_MS);
    const input = await readJson(request, loginSchema);
    await connectToDatabase();

    const user = await User.findOne({ emailNormalized: normalizeEmail(input.email) });
    if (!user || !user.passwordHash) {
      await writeAuditLog({ action: "auth.login_failed", targetType: "user", metadata: { email: normalizeEmail(input.email), reason: "not_found" }, request });
      return fail("UNAUTHORIZED", "بيانات الدخول غير صحيحة", 401);
    }

    if (user.status === "disabled") return fail("FORBIDDEN", "هذا الحساب معطل", 403);
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return fail("FORBIDDEN", "الحساب مقفل مؤقتا بسبب محاولات متكررة", 403);

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= LOCK_AFTER) {
        user.status = "locked";
        user.lockedUntil = new Date(Date.now() + LOCK_MS);
      }
      await user.save();
      await writeAuditLog({ actorUserId: user._id, actorRole: user.role, action: "auth.login_failed", targetType: "user", targetId: user._id, metadata: { reason: "bad_password" }, request });
      return fail("UNAUTHORIZED", "بيانات الدخول غير صحيحة", 401);
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    if (user.status === "locked") user.status = "active";
    user.lastLoginAt = new Date();
    await user.save();

    const response = ok({ user: safeUser(user) });
    setAuthCookie(response, await signAuthToken(user));
    await writeAuditLog({ actorUserId: user._id, actorRole: user.role, action: "auth.login", targetType: "user", targetId: user._id, request });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
