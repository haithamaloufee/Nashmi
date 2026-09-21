import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { getMaxDocumentUploadSizeBytes, getMaxImageUploadSizeBytes, getMaxVideoUploadSizeBytes, hasR2Credentials } from "@/lib/env";
import { confirmMediaUpload } from "@/lib/mediaStorage";
import { roles } from "@/lib/permissions";
import { requireRateLimit } from "@/lib/rateLimit";
import { serialize } from "@/lib/routeUtils";
import { getObjectStorage } from "@/lib/storage/index";
import MediaAsset from "@/models/MediaAsset";
import AuthorityProfile from "@/models/AuthorityProfile";
import Law from "@/models/Law";
import Party from "@/models/Party";
import Post from "@/models/Post";
import User from "@/models/User";

export const runtime = "nodejs";

const uploadRoles = [...roles];
export async function GET() {
  return ok({
    directR2Upload: hasR2Credentials(),
    maxImageSizeBytes: getMaxImageUploadSizeBytes(),
    maxVideoSizeBytes: getMaxVideoUploadSizeBytes(),
    maxDocumentSizeBytes: getMaxDocumentUploadSizeBytes()
  });
}

export async function POST() {
  return fail("BAD_REQUEST", "استخدم مسار التفويض للرفع المباشر إلى التخزين.", 405);
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser(uploadRoles);
    await requireRateLimit(`upload-complete:${user.id}`, 30, 60 * 60 * 1000);

    const input = await request.json().catch(() => null) as { assetId?: string } | null;
    if (!input?.assetId) {
      return fail("BAD_REQUEST", "بيانات الملف المرفوع غير مكتملة", 400);
    }
    const asset = await confirmMediaUpload({ user, assetId: input.assetId });
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
    const asset = await MediaAsset.findOne({ _id: assetId, ownerUserId: user.id }).lean();
    if (!asset) return fail("NOT_FOUND", "الملف غير موجود", 404);
    if (asset.status === "deleted") return ok({ asset: serialize(asset) });
    const [postReference, partyReference, authorityReference, lawReference, avatarReference] = await Promise.all([
      Post.exists({ mediaIds: asset._id, status: { $ne: "deleted" } }),
      Party.exists({ $or: [{ logoMediaId: asset._id }, { coverMediaId: asset._id }] }),
      AuthorityProfile.exists({ $or: [{ logoMediaId: asset._id }, { coverMediaId: asset._id }] }),
      Law.exists({ thumbnailMediaId: asset._id }),
      User.exists({ avatarMediaId: asset._id })
    ]);
    if (postReference || partyReference || authorityReference || lawReference || avatarReference) {
      return fail("CONFLICT", "الملف مستخدم حاليًا. أزل ارتباطه بالمحتوى أولًا.", 409);
    }
    if (asset.provider !== "cloudflare_r2") {
      const legacy = await MediaAsset.findOneAndUpdate(
        { _id: asset._id, ownerUserId: user.id, status: { $ne: "deleted" } },
        { $set: { status: "deleted", deletedAt: new Date() } },
        { new: true }
      ).lean();
      return ok({ asset: serialize(legacy) });
    }
    const locked = await MediaAsset.findOneAndUpdate(
      { _id: asset._id, ownerUserId: user.id, status: { $nin: ["deleting", "deleted"] } },
      { $set: { status: "deleting" } },
      { new: true }
    ).lean();
    if (!locked) return ok({ asset: serialize(asset) });
    try {
      await getObjectStorage().deleteObject(locked.storageKey);
    } catch (error) {
      await MediaAsset.updateOne({ _id: locked._id, status: "deleting" }, { $set: { status: "failed", failureReason: "delete_failed" } });
      throw error;
    }
    const deleted = await MediaAsset.findOneAndUpdate(
      { _id: locked._id, status: "deleting" },
      { $set: { status: "deleted", deletedAt: new Date(), failureReason: null } },
      { new: true }
    ).lean();
    return ok({ asset: serialize(deleted) });
  } catch (error) {
    return handleApiError(error);
  }
}
