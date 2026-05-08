import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import { serialize } from "@/lib/routeUtils";
import { assetTypeForMimeType, extensionForMimeType, hasValidUploadMagic, validateUploadFile } from "@/lib/uploadValidation";
import { storePublicFile } from "@/lib/storage";
import MediaAsset from "@/models/MediaAsset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("BAD_REQUEST", "الملف مطلوب", 400);

    const validationError = validateUploadFile(file);
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
      status: "active"
    });

    return ok({ asset: serialize(asset) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
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
