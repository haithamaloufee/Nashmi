import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { getRequiredEnv } from "@/lib/env";
import { assertPipelineWriteIsolation, runNewsDiscovery } from "@/lib/news/pipeline";
import { getNewsPipelineMode } from "@/lib/news/pipelineMode";
import { verifyNewsRefreshSignatureWithSecret } from "@/lib/news/securityCore";
import { isDuplicateKeyError } from "@/lib/routeUtils";
import NewsRefreshReplay from "@/models/NewsRefreshReplay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (getNewsPipelineMode() === "legacy") return fail("CONFLICT", "رصد الأخبار الجديد غير مفعل", 409);
    const secret = getRequiredEnv("NEWS_DISCOVERY_SECRET");
    if (secret.length < 32) throw new Error("NEWS_DISCOVERY_SECRET_INVALID");
    const verified = verifyNewsRefreshSignatureWithSecret(request, secret, Date.now(), "/api/internal/news/discover");
    await assertPipelineWriteIsolation();
    try {
      await NewsRefreshReplay.create({ signatureHash: verified.signatureHash, expiresAt: new Date(Date.now() + 10 * 60_000) });
    } catch (error) {
      if (isDuplicateKeyError(error)) return fail("CONFLICT", "تم استخدام توقيع الرصد مسبقاً", 409);
      throw error;
    }
    return ok(await runNewsDiscovery());
  } catch (error) {
    if (error instanceof Error && ["NEWS_SIGNATURE_EXPIRED", "NEWS_SIGNATURE_INVALID"].includes(error.message)) return fail("UNAUTHORIZED", "توقيع طلب الرصد غير صالح", 401);
    if (error instanceof Error && error.message === "NEWS_DISCOVERY_LOCKED") return fail("CONFLICT", "يوجد رصد قيد التنفيذ", 409);
    return handleApiError(error, request);
  }
}
