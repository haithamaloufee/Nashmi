import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { hasBlobReadWriteToken } from "@/lib/env";
import { roles } from "@/lib/permissions";
import { extensionForMimeType, maxUploadSizeForMimeType, validateUploadMetadata } from "@/lib/uploadValidation";

export const runtime = "nodejs";

type ClientPayload = {
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  purpose?: string;
};

function parsePayload(value: string | null): ClientPayload {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser([...roles]);
    if (!hasBlobReadWriteToken()) {
      return fail("SERVER_ERROR", "تخزين الملفات الدائم غير مفعّل. أضف BLOB_READ_WRITE_TOKEN في بيئة النشر.", 503);
    }

    const body = await request.json() as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        const payload = parsePayload(clientPayload);
        if (!payload.fileName || !payload.mimeType || typeof payload.sizeBytes !== "number") {
          throw new Error("BAD_REQUEST");
        }

        const mimeType = payload.mimeType.toLowerCase();
        const validationError = validateUploadMetadata({ fileName: payload.fileName, mimeType, size: payload.sizeBytes, imagesOnly: payload.purpose !== "post" });
        if (validationError) throw new Error("BAD_REQUEST");

        const expectedPrefix = "media/direct/";
        const expectedExtension = `.${extensionForMimeType(mimeType)}`;
        if (!pathname.startsWith(expectedPrefix) || !pathname.endsWith(expectedExtension)) {
          throw new Error("FORBIDDEN");
        }

        return {
          allowedContentTypes: [mimeType],
          maximumSizeInBytes: maxUploadSizeForMimeType(mimeType),
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify({ ...payload, userId: user.id, pathname, multipart })
        };
      }
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "BAD_REQUEST") return fail("BAD_REQUEST", "بيانات الملف غير صالحة", 400);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("FORBIDDEN", "مسار الملف غير مصرح", 403);
    return handleApiError(error);
  }
}
