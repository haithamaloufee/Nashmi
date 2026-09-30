import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { getRequiredEnv } from "@/lib/env";
import { getNewsPipelineMode } from "@/lib/news/pipelineMode";
import { verifyNewsPreviewIsolation } from "@/lib/news/previewIsolation";
import { verifyNewsRefreshSignatureWithSecret } from "@/lib/news/securityCore";
import { getNewsConfig } from "@/lib/news/config";
import { mayPublishNewPipeline } from "@/lib/news/pipelineMode";

export const dynamic = "force-dynamic";

/** Machine-authenticated, Preview-only inspection with no database writes. */
export async function GET(request: Request) {
  try {
    if (process.env.VERCEL_ENV !== "preview") return fail("NOT_FOUND", "المسار غير متاح", 404);
    const secret = getRequiredEnv("NEWS_DISCOVERY_SECRET");
    if (secret.length < 32) throw new Error("NEWS_DISCOVERY_SECRET_INVALID");
    verifyNewsRefreshSignatureWithSecret(request, secret, Date.now(), "/api/internal/news/preview-check", "GET");
    const connection = await verifyNewsPreviewIsolation();
    return ok({ isolated: true, ...connection, mode: getNewsPipelineMode(), publicationEnabled: mayPublishNewPipeline(), maxNewItems: getNewsConfig().maxNewItems, branch: process.env.VERCEL_GIT_COMMIT_REF || null, commit: process.env.VERCEL_GIT_COMMIT_SHA || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && ["NEWS_SIGNATURE_EXPIRED", "NEWS_SIGNATURE_INVALID"].includes(error.message)) return fail("UNAUTHORIZED", "توقيع طلب الفحص غير صالح", 401);
    return handleApiError(error, request);
  }
}
