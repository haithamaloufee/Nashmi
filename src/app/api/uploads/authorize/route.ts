import { randomUUID } from "node:crypto";
import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { InvalidEnvError, MissingEnvError } from "@/lib/env";
import { requireActiveUser } from "@/lib/auth";
import { createMediaUploadAuthorization, parseMediaPurpose, type UploadAuthorizationStage } from "@/lib/mediaStorage";
import { requestIdFrom } from "@/lib/observability";
import { roles } from "@/lib/permissions";
import { requireRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request) || randomUUID();
  let stage: UploadAuthorizationStage | "authentication" | "rate_limit" | "request_validation" = "authentication";
  const finish = (response: Response, error?: unknown) => {
    response.headers.set("X-Request-ID", requestId);
    if (error && response.status >= 500) {
      const category = error instanceof MissingEnvError || error instanceof InvalidEnvError
        ? "configuration"
        : typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000
          ? "database"
          : stage === "presign"
            ? "storage"
            : ["mongo_connection", "quota_check", "asset_create"].includes(stage)
              ? "database"
              : "application";
      console.error({ event: "media.upload_authorize.failure", requestId, stage, category, durationMs: Date.now() - startedAt, provider: "cloudflare_r2", status: response.status });
    }
    return response;
  };
  try {
    const user = await requireActiveUser([...roles]);
    stage = "rate_limit";
    await requireRateLimit(`upload-authorize:${user.id}`, 30, 60 * 60 * 1000);
    stage = "request_validation";
    const input = await request.json().catch(() => null) as {
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      purpose?: unknown;
    } | null;
    const purpose = parseMediaPurpose(input?.purpose);
    if (!input?.fileName || !input.mimeType || typeof input.sizeBytes !== "number" || !purpose) {
      return finish(fail("BAD_REQUEST", "بيانات الملف غير مكتملة", 400));
    }
    const result = await createMediaUploadAuthorization({
      user,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      purpose,
      onStage: (nextStage) => { stage = nextStage; }
    });
    return finish(ok(result, { status: 201, headers: { "Cache-Control": "private, no-store" } }));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UPLOAD_VALIDATION:")) {
      return finish(fail("BAD_REQUEST", error.message.slice("UPLOAD_VALIDATION:".length), 400), error);
    }
    if (error instanceof Error && error.message === "MEDIA_TOTAL_QUOTA_EXCEEDED") {
      return finish(fail("FORBIDDEN", "تم تجاوز مساحة التخزين المتاحة لهذا الحساب.", 403), error);
    }
    if (error instanceof Error && error.message === "MEDIA_DAILY_QUOTA_EXCEEDED") {
      return finish(fail("RATE_LIMITED", "تم تجاوز حد الرفع اليومي لهذا الحساب.", 429), error);
    }
    return finish(handleApiError(error, request), error);
  }
}
