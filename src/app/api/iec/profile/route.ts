import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { authorityLogoUpdateSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import { resolveOwnedReadyMediaId } from "@/lib/mediaReferences";
import { stableMediaUrlForAsset } from "@/lib/mediaIdentity";
import AuthorityProfile from "@/models/AuthorityProfile";
import User from "@/models/User";

function isUploadedProfileImageUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string") return false;
  return value.startsWith("/api/media/");
}

function changed(value: unknown, existing: unknown) {
  return value !== undefined && value !== (existing || null);
}

function hostnameOnly(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("/")) return "local";
  try {
    return new URL(value).hostname;
  } catch {
    return "invalid";
  }
}

function revalidateAuthorityProfilePaths() {
  const paths = ["/", "/updates", "/iec", "/iec-dashboard", "/iec-dashboard/profile"];
  const failures: string[] = [];
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      failures.push(path);
    }
  }
  return failures;
}

export async function GET() {
  try {
    await requireActiveUser(["iec"]);
    await connectToDatabase();
    const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission" }).lean();
    if (!authority) throw new Error("NOT_FOUND");
    return ok({ authority: serialize(authority) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") || randomUUID();
  try {
    const user = await requireActiveUser(["iec"]);
    const input = await readJson(request, authorityLogoUpdateSchema);
    await connectToDatabase();
    const existing = await AuthorityProfile.findOne({ slug: "independent-election-commission" });
    if (!existing) throw new Error("NOT_FOUND");
    if (changed(input.logoUrl, existing.logoUrl) && !isUploadedProfileImageUrl(input.logoUrl)) {
      return fail("BAD_REQUEST", "ارفع شعار الهيئة من الجهاز بدلا من إدخال رابط صورة خارجي.", 400);
    }
    if (changed(input.coverUrl, existing.coverUrl) && !isUploadedProfileImageUrl(input.coverUrl)) {
      return fail("BAD_REQUEST", "ارفع غلاف الهيئة من الجهاز بدلا من إدخال رابط صورة خارجي.", 400);
    }
    const update: Record<string, unknown> = { ...input };
    if (changed(input.logoUrl, existing.logoUrl)) {
      const mediaId = input.logoUrl
        ? await resolveOwnedReadyMediaId({ url: input.logoUrl, ownerUserId: user.id, purposes: ["authority_logo"], requireMatch: true })
        : null;
      update.logoMediaId = mediaId;
      if (mediaId) update.logoUrl = stableMediaUrlForAsset(String(mediaId));
    }
    if (changed(input.coverUrl, existing.coverUrl)) {
      const mediaId = input.coverUrl
        ? await resolveOwnedReadyMediaId({ url: input.coverUrl, ownerUserId: user.id, purposes: ["authority_cover"], requireMatch: true })
        : null;
      update.coverMediaId = mediaId;
      if (mediaId) update.coverUrl = stableMediaUrlForAsset(String(mediaId));
    }
    const authority = await AuthorityProfile.findByIdAndUpdate(existing._id, { $set: update }, { new: true }).lean();
    if (changed(input.logoUrl, existing.logoUrl)) {
      await User.updateOne({ _id: user.id }, { $set: { avatarUrl: update.logoUrl || null, avatarMediaId: update.logoMediaId || null } });
    }
    const revalidationFailures = revalidateAuthorityProfilePaths();
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "iec.profile_update", targetType: "authority", targetId: existing._id, request });
    console.info({
      requestId,
      route: "/api/iec/profile",
      userId: user.id,
      userRole: user.role,
      targetAuthorityId: String(existing._id),
      updatedFields: Object.keys(update),
      oldImageExisted: Boolean(existing.logoUrl),
      newImageHostname: hostnameOnly(input.logoUrl),
      dbUpdateSuccess: Boolean(authority),
      revalidationSuccess: revalidationFailures.length === 0,
      revalidationFailures,
      durationMs: Date.now() - startedAt
    });
    return ok({ authority: serialize(authority) });
  } catch (error) {
    console.error({
      requestId,
      route: "/api/iec/profile",
      dbUpdateSuccess: false,
      durationMs: Date.now() - startedAt
    });
    return handleApiError(error);
  }
}
