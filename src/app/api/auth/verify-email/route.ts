import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { connectToDatabase } from "@/lib/db";
import { tokenSchema } from "@/lib/validators";
import { readJsonWithLimit } from "@/lib/routeUtils";
import { hashAuthToken } from "@/lib/authTokens";
import { sendTransactionalEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/emailTemplates";
import { buildSiteUrl } from "@/lib/siteUrl";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const input = await readJsonWithLimit(request, tokenSchema, 1024);
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { emailVerificationTokenHash: hashAuthToken(input.token), emailVerificationExpiresAt: { $gt: new Date() }, emailVerified: false },
      { $set: { emailVerified: true, status: "active", emailVerificationTokenHash: null, emailVerificationExpiresAt: null } },
      { new: true }
    );
    if (!user) return fail("BAD_REQUEST", "رابط التفعيل غير صالح أو منتهي أو مستخدم سابقًا", 400);
    try { await sendTransactionalEmail(user.email, welcomeEmail(user.language, buildSiteUrl("/login"))); } catch { /* Verification remains committed. */ }
    return ok({ verified: true });
  } catch (error) {
    return handleApiError(error);
  }
}
