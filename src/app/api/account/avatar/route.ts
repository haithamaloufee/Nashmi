import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser, safeUser } from "@/lib/auth";
import { confirmMediaUpload } from "@/lib/mediaStorage";
import { requireRateLimit } from "@/lib/rateLimit";
import { getObjectStorage } from "@/lib/storage/index";
import MediaAsset from "@/models/MediaAsset";
import User from "@/models/User";
import Party from "@/models/Party";
import AuthorityProfile from "@/models/AuthorityProfile";

export const runtime = "nodejs";

const uploadRoles = ["citizen", "party", "iec", "admin", "super_admin"] as const;

function revalidatePublisherAvatarPaths(role: string, userId: string, slug?: string | null) {
  const paths = [`/users/${userId}`];
  if (role === "party") {
    paths.push("/", "/updates", "/parties", "/party-dashboard", "/party-dashboard/profile");
    if (slug) paths.push(`/parties/${slug}`);
  }
  if (role === "iec") paths.push("/", "/updates", "/iec", "/iec-dashboard", "/iec-dashboard/profile");
  for (const path of paths) revalidatePath(path);
}

async function syncPublisherProfileAvatar(user: { id: string; role: string }, avatarUrl: string | null) {
  if (user.role === "party") {
    const party = await Party.findOneAndUpdate(
      { accountUserId: user.id, status: { $ne: "disabled" } },
      { $set: { logoUrl: avatarUrl } },
      { new: true }
    ).select("slug").lean();
    revalidatePublisherAvatarPaths(user.role, user.id, party?.slug || null);
    return { targetType: "party", targetId: party?._id ? String(party._id) : null, slug: party?.slug || null };
  }

  if (user.role === "iec") {
    const authority = await AuthorityProfile.findOneAndUpdate(
      { slug: "independent-election-commission" },
      { $set: { logoUrl: avatarUrl } },
      { new: true }
    ).select("slug").lean();
    revalidatePublisherAvatarPaths(user.role, user.id);
    return { targetType: "authority", targetId: authority?._id ? String(authority._id) : null, slug: authority?.slug || null };
  }

  revalidatePublisherAvatarPaths(user.role, user.id);
  return { targetType: "user", targetId: user.id, slug: null };
}

export async function POST() {
  return fail("BAD_REQUEST", "استخدم الرفع المباشر للصورة.", 405);
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser([...uploadRoles]);
    await requireRateLimit(`avatar-complete:${user.id}`, 10, 60 * 60 * 1000);
    const input = await request.json().catch(() => null) as { assetId?: string } | null;
    if (!input?.assetId) {
      return fail("BAD_REQUEST", "بيانات الصورة المرفوعة غير مكتملة", 400);
    }
    await connectToDatabase();
    const pending = await MediaAsset.findOne({ _id: input.assetId, ownerUserId: user.id, purpose: "avatar" }).select("_id").lean();
    if (!pending) return fail("FORBIDDEN", "الصورة ليست مخصصة لهذا الحساب.", 403);
    const asset = await confirmMediaUpload({ user, assetId: input.assetId });
    const previousUser = await User.findById(user.id).select("avatarMediaId").lean();
    const updated = await User.findByIdAndUpdate(
      user.id,
      { $set: { avatarUrl: asset.url, avatarMediaId: asset._id } },
      { new: true }
    );
    if (!updated) throw new Error("NOT_FOUND");
    await syncPublisherProfileAvatar(user, asset.url);
    if (previousUser?.avatarMediaId && String(previousUser.avatarMediaId) !== String(asset._id)) {
      const previousAsset = await MediaAsset.findOneAndUpdate(
        { _id: previousUser.avatarMediaId, ownerUserId: user.id, provider: "cloudflare_r2", status: { $in: ["ready", "active"] } },
        { $set: { status: "deleting" } },
        { new: true }
      ).lean();
      if (previousAsset) {
        try {
          await getObjectStorage().deleteObject(previousAsset.storageKey);
          await MediaAsset.updateOne({ _id: previousAsset._id, status: "deleting" }, { $set: { status: "deleted", deletedAt: new Date() } });
        } catch {
          await MediaAsset.updateOne({ _id: previousAsset._id, status: "deleting" }, { $set: { status: "failed", failureReason: "delete_failed" } });
        }
      }
    }
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireActiveUser([...uploadRoles]);
    await connectToDatabase();
    const current = await User.findById(user.id).select("avatarMediaId").lean();
    const asset = current?.avatarMediaId
      ? await MediaAsset.findOneAndUpdate(
          { _id: current.avatarMediaId, ownerUserId: user.id, status: { $nin: ["deleted", "deleting"] } },
          { $set: { status: "deleting" } },
          { new: true }
        ).lean()
      : null;
    if (asset?.provider === "cloudflare_r2") {
      try {
        await getObjectStorage().deleteObject(asset.storageKey);
        await MediaAsset.updateOne(
          { _id: asset._id, status: "deleting" },
          { $set: { status: "deleted", deletedAt: new Date(), failureReason: null } }
        );
      } catch (error) {
        await MediaAsset.updateOne(
          { _id: asset._id, status: "deleting" },
          { $set: { status: "failed", failureReason: "delete_failed" } }
        );
        throw error;
      }
    } else if (asset) {
      await MediaAsset.updateOne({ _id: asset._id }, { $set: { status: "deleted", deletedAt: new Date() } });
    }
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: null, avatarMediaId: null } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    await syncPublisherProfileAvatar(user, null);
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
