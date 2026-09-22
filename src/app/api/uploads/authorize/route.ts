import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { createMediaUploadAuthorization, parseMediaPurpose } from "@/lib/mediaStorage";
import { roles } from "@/lib/permissions";
import { requireRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser([...roles]);
    await requireRateLimit(`upload-authorize:${user.id}`, 30, 60 * 60 * 1000);
    const input = await request.json().catch(() => null) as {
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      purpose?: unknown;
    } | null;
    const purpose = parseMediaPurpose(input?.purpose);
    if (!input?.fileName || !input.mimeType || typeof input.sizeBytes !== "number" || !purpose) {
      return fail("BAD_REQUEST", "بيانات الملف غير مكتملة", 400);
    }
    const result = await createMediaUploadAuthorization({
      user,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      purpose
    });
    return ok(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UPLOAD_VALIDATION:")) {
      return fail("BAD_REQUEST", error.message.slice("UPLOAD_VALIDATION:".length), 400);
    }
    if (error instanceof Error && error.message === "MEDIA_TOTAL_QUOTA_EXCEEDED") {
      return fail("FORBIDDEN", "تم تجاوز مساحة التخزين المتاحة لهذا الحساب.", 403);
    }
    if (error instanceof Error && error.message === "MEDIA_DAILY_QUOTA_EXCEEDED") {
      return fail("RATE_LIMITED", "تم تجاوز حد الرفع اليومي لهذا الحساب.", 429);
    }
    return handleApiError(error, request);
  }
}
