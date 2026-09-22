import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { connectToDatabase } from "@/lib/db";
import { verifyNewsRefreshSignature } from "@/lib/news/security";
import { refreshNews } from "@/lib/news/service";
import { isDuplicateKeyError } from "@/lib/routeUtils";
import NewsRefreshReplay from "@/models/NewsRefreshReplay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const verified = verifyNewsRefreshSignature(request);
    await connectToDatabase();
    try {
      await NewsRefreshReplay.create({ signatureHash: verified.signatureHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    } catch (error) {
      if (isDuplicateKeyError(error)) return fail("CONFLICT", "تم استخدام توقيع التحديث مسبقاً", 409);
      throw error;
    }
    const result = await refreshNews();
    return ok(result);
  } catch (error) {
    if (error instanceof Error && ["NEWS_SIGNATURE_EXPIRED", "NEWS_SIGNATURE_INVALID"].includes(error.message)) {
      return fail("UNAUTHORIZED", "توقيع طلب التحديث غير صالح", 401);
    }
    if (error instanceof Error && error.message === "NEWS_REFRESH_LOCKED") {
      return fail("CONFLICT", "يوجد تحديث أخبار قيد التنفيذ", 409);
    }
    return handleApiError(error, request);
  }
}
