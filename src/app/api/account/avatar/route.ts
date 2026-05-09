import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser, safeUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import { extensionForMimeType, hasValidUploadMagic, validateUploadFile, validateUploadMetadata } from "@/lib/uploadValidation";
import { storePublicFile } from "@/lib/storage";
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

async function readRemoteMagic(url: string) {
  const response = await fetch(url, { headers: { Range: "bytes=0-63" }, cache: "no-store" });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

function isVercelBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser([...uploadRoles]);
    requireRateLimit(`avatar:${user.id}`, 10, 60 * 60 * 1000);

    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return fail("BAD_REQUEST", "الصورة مطلوبة", 400);

    const validationError = validateUploadFile(file, { imagesOnly: true });
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const mimeType = file.type.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidUploadMagic(buffer, mimeType)) return fail("BAD_REQUEST", "نوع الصورة لا يطابق محتواها", 400);

    const storageKey = `avatars/${user.id}/${randomUUID()}.${extensionForMimeType(mimeType)}`;
    const stored = await storePublicFile({ buffer, storageKey, contentType: mimeType });

    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: stored.url } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    await syncPublisherProfileAvatar(user, stored.url);
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser([...uploadRoles]);
    requireRateLimit(`avatar-complete:${user.id}`, 10, 60 * 60 * 1000);
    const input = await request.json().catch(() => null) as {
      url?: string;
      storageKey?: string;
      mimeType?: string;
      sizeBytes?: number;
      fileName?: string;
    } | null;
    if (!input?.url || !input.storageKey || !input.mimeType || !input.fileName || typeof input.sizeBytes !== "number") {
      return fail("BAD_REQUEST", "بيانات الصورة المرفوعة غير مكتملة", 400);
    }

    const mimeType = input.mimeType.toLowerCase();
    const validationError = validateUploadMetadata({ fileName: input.fileName, mimeType, size: input.sizeBytes, imagesOnly: true });
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const storageKey = input.storageKey.replace(/^\/+/, "");
    if (!storageKey.startsWith(`media/${user.id}/`) && !storageKey.startsWith(`avatars/${user.id}/`) && !storageKey.startsWith("media/direct/")) {
      return fail("FORBIDDEN", "مسار الصورة لا يخص هذا الحساب", 403);
    }
    if (storageKey.startsWith("media/direct/") && !isVercelBlobUrl(input.url)) {
      return fail("FORBIDDEN", "روابط الصور الخارجية غير مسموحة. استخدم رفع الملفات من الجهاز.", 403);
    }

    const magic = await readRemoteMagic(input.url);
    if (!magic || !hasValidUploadMagic(magic, mimeType)) return fail("BAD_REQUEST", "نوع الصورة لا يطابق محتواها", 400);

    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: input.url } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    await syncPublisherProfileAvatar(user, input.url);
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireActiveUser([...uploadRoles]);
    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: null } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    await syncPublisherProfileAvatar(user, null);
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
