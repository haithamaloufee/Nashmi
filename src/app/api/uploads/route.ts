import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { getMaxImageUploadSizeBytes, getMaxVideoUploadSizeBytes, hasBlobReadWriteToken } from "@/lib/env";
import { roles } from "@/lib/permissions";
import { requireRateLimit } from "@/lib/rateLimit";
import { serialize } from "@/lib/routeUtils";
import { assetTypeForMimeType, extensionForMimeType, hasValidUploadMagic, validateUploadFile, validateUploadMetadata } from "@/lib/uploadValidation";
import { storePublicFile } from "@/lib/storage";
import MediaAsset from "@/models/MediaAsset";

export const runtime = "nodejs";

const uploadRoles = [...roles];
const allowedPurposes = new Set(["post", "party_logo", "party_cover", "authority_logo", "authority_cover", "law_thumbnail", "misc"]);

function cleanPurpose(value: unknown) {
  return typeof value === "string" && allowedPurposes.has(value) ? value : "post";
}

async function readRemoteMagic(url: string) {
  const response = await fetch(url, { headers: { Range: "bytes=0-63" }, cache: "no-store" });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function GET() {
  return ok({
    directBlobUpload: hasBlobReadWriteToken(),
    maxImageSizeBytes: getMaxImageUploadSizeBytes(),
    maxVideoSizeBytes: getMaxVideoUploadSizeBytes()
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(uploadRoles);
    requireRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("BAD_REQUEST", "الملف مطلوب", 400);
    const purpose = cleanPurpose(form.get("purpose"));

    const validationError = validateUploadFile(file, { imagesOnly: purpose !== "post" });
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const mimeType = file.type.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidUploadMagic(buffer, mimeType)) return fail("BAD_REQUEST", "نوع الملف لا يطابق محتواه", 400);

    await connectToDatabase();
    const storageKey = `media/${user.id}/${randomUUID()}.${extensionForMimeType(mimeType)}`;
    const stored = await storePublicFile({ buffer, storageKey, contentType: mimeType });

    const asset = await MediaAsset.create({
      ownerUserId: user.id,
      url: stored.url,
      storageKey: stored.storageKey,
      mimeType,
      sizeBytes: file.size,
      width: null,
      height: null,
      type: assetTypeForMimeType(mimeType),
      provider: stored.provider,
      purpose,
      status: "active"
    });

    return ok({ asset: serialize(asset) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser(uploadRoles);
    requireRateLimit(`upload-complete:${user.id}`, 30, 60 * 60 * 1000);

    const input = await request.json().catch(() => null) as {
      url?: string;
      storageKey?: string;
      mimeType?: string;
      sizeBytes?: number;
      fileName?: string;
      purpose?: string;
    } | null;

    if (!input?.url || !input.storageKey || !input.mimeType || !input.fileName || typeof input.sizeBytes !== "number") {
      return fail("BAD_REQUEST", "بيانات الملف المرفوع غير مكتملة", 400);
    }

    const mimeType = input.mimeType.toLowerCase();
    const purpose = cleanPurpose(input.purpose);
    const validationError = validateUploadMetadata({ fileName: input.fileName, mimeType, size: input.sizeBytes, imagesOnly: purpose !== "post" });
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const storageKey = input.storageKey.replace(/^\/+/, "");
    if (!storageKey.startsWith(`media/${user.id}/`) && !storageKey.startsWith("media/direct/")) return fail("FORBIDDEN", "مسار الملف لا يخص هذا الحساب", 403);

    const magic = await readRemoteMagic(input.url);
    if (!magic || !hasValidUploadMagic(magic, mimeType)) return fail("BAD_REQUEST", "نوع الملف لا يطابق محتواه", 400);

    await connectToDatabase();
    const asset = await MediaAsset.findOneAndUpdate(
      { ownerUserId: user.id, storageKey },
      {
        $setOnInsert: {
          ownerUserId: user.id,
          storageKey,
          width: null,
          height: null
        },
        $set: {
          url: input.url,
          mimeType,
          sizeBytes: input.sizeBytes,
          type: assetTypeForMimeType(mimeType),
          provider: "vercel_blob",
          purpose,
          status: "active"
        }
      },
      { new: true, upsert: true }
    );

    return ok({ asset: serialize(asset) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireActiveUser(uploadRoles);
    const url = new URL(request.url);
    const assetId = url.searchParams.get("assetId");
    if (!assetId) return fail("BAD_REQUEST", "معرف الملف مطلوب", 400);

    await connectToDatabase();
    const asset = await MediaAsset.findOneAndUpdate(
      { _id: assetId, ownerUserId: user.id },
      { $set: { status: "deleted" } },
      { new: true }
    ).lean();

    if (!asset) return fail("NOT_FOUND", "الملف غير موجود", 404);
    return ok({ asset: serialize(asset) });
  } catch (error) {
    return handleApiError(error);
  }
}
