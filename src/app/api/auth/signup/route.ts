import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { signupSchema } from "@/lib/validators";
import { normalizeEmail, getClientIp } from "@/lib/security";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson, isDuplicateKeyError } from "@/lib/routeUtils";
import { safeUser, signAuthToken } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    requireRateLimit(`signup:${getClientIp(request)}`, 3, 60 * 60 * 1000);
    const input = await readJson(request, signupSchema);
    await connectToDatabase();

    const emailNormalized = normalizeEmail(input.email);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const status = process.env.REQUIRE_EMAIL_VERIFICATION === "true" ? "pending" : "active";

    const user = await User.create({
      name: input.name,
      email: input.email.trim(),
      emailNormalized,
      emailVerified: false,
      passwordHash,
      role: "citizen",
      provider: "credentials",
      status,
      language: "ar"
    });

    const response = ok({ user: safeUser(user) }, { status: 201 });
    if (status === "active") setAuthCookie(response, await signAuthToken(user));
    await writeAuditLog({ actorUserId: user._id, actorRole: user.role, action: "auth.signup", targetType: "user", targetId: user._id, request });
    return response;
  } catch (error) {
    if (isDuplicateKeyError(error)) return fail("CONFLICT", "البريد الإلكتروني مستخدم بالفعل", 409);
    return handleApiError(error);
  }
}
