import { fail, handleApiError } from "@/lib/apiResponse";
import { requireRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireRateLimit(`password-reset:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    return fail("BAD_REQUEST", "إعادة تعيين كلمة المرور تحتاج رمز آمن من البريد. هذه الواجهة لا تقبل تغييرا بدون رمز.", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
