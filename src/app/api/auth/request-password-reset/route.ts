import { ok, handleApiError } from "@/lib/apiResponse";
import { requireRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireRateLimit(`password-reset-request:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    return ok({
      accepted: true,
      message: "إذا كان البريد مسجلا فسيتم إرسال رابط إعادة تعيين عبر مزود بريد عند تهيئته."
    });
  } catch (error) {
    return handleApiError(error);
  }
}
