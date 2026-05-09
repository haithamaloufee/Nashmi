import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { canDeleteOwnPost, canEditOwnPost, isAdmin } from "@/lib/permissions";
import { attachPublisherSnapshots, getAuthorityAuthor } from "@/lib/publisher";
import { normalizePopulatedMedia } from "@/lib/media";
import { postUpdateSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { cleanContent, readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Post from "@/models/Post";
import Party from "@/models/Party";
import MediaAsset from "@/models/MediaAsset";

type Context = { params: Promise<{ id: string }> };

const deleteSchema = z.object({ reason: z.string().trim().min(3).max(1000).optional() });

async function revalidatePostSurfaces(post: { partyId?: unknown; publisherSnapshot?: { href?: string | null } | null; authorType?: string }) {
  revalidatePath("/updates");
  revalidatePath("/");
  if (post.publisherSnapshot?.href) revalidatePath(post.publisherSnapshot.href);
  if (post.authorType === "iec") revalidatePath("/iec");
  if (post.partyId) {
    const party = await Party.findById(post.partyId).select("slug").lean();
    if (party?.slug) revalidatePath(`/parties/${party.slug}`);
  }
}

async function serializePostForResponse(id: string) {
  const populated = await Post.findById(id)
    .populate({ path: "authorUserId", select: "name avatarUrl image role" })
    .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
    .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
    .lean();
  if (!populated) return null;
  const authorityAuthor = await getAuthorityAuthor();
  const [withPublisher] = attachPublisherSnapshots([normalizePopulatedMedia(populated as any)], authorityAuthor);
  return serialize(withPublisher);
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const post = await Post.findOneAndUpdate({ _id: id, status: "published" }, { $inc: { viewsCount: 1 } }, { new: true }).lean();
    if (!post) throw new Error("NOT_FOUND");
    return ok({ post: serialize(post) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const startedAt = Date.now();
  try {
    const user = await requireActiveUser(["party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, postUpdateSchema);
    await connectToDatabase();
    const post = await Post.findById(id);
    if (!post || post.status === "deleted") throw new Error("NOT_FOUND");

    const ownerAuthorized = canEditOwnPost(user, post);
    const moderationAuthorized = isAdmin(user.role) && input.status !== undefined && input.title === undefined && input.content === undefined && input.tags === undefined && input.mediaIds === undefined;
    if (!ownerAuthorized && !moderationAuthorized) {
      console.info({ route: "/api/posts/[id]", action: "update", userId: user.id, role: user.role, postId: id, ownerId: String(post.authorUserId), authorized: false, durationMs: Date.now() - startedAt });
      return fail("FORBIDDEN", "تعديل المحتوى متاح للمالك فقط.", 403);
    }

    const update: Record<string, unknown> = {};
    if (input.title !== undefined && ownerAuthorized) update.title = input.title || null;
    if (input.content !== undefined && ownerAuthorized) update.content = cleanContent(input.content);
    if (input.tags !== undefined && ownerAuthorized) update.tags = input.tags;
    if (input.mediaIds !== undefined) {
      if (!ownerAuthorized) return fail("FORBIDDEN", "تعديل وسائط المنشور متاح للمالك فقط.", 403);
      const mediaQuery: Record<string, unknown> = { _id: { $in: input.mediaIds }, status: "active", ownerUserId: user.id };
      const activeMediaCount = await MediaAsset.countDocuments(mediaQuery);
      if (activeMediaCount !== input.mediaIds.length) return fail("BAD_REQUEST", "بعض المرفقات غير مكتملة أو لا تخص هذا الحساب.", 400);
      update.mediaIds = input.mediaIds;
    }
    if (input.status !== undefined && (moderationAuthorized || ownerAuthorized)) update.status = input.status;
    update.searchNormalized = createSearchText([String(update.title ?? post.title ?? ""), String(update.content ?? post.content), ...((update.tags as string[] | undefined) || post.tags || [])]);

    await Post.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    await revalidatePostSurfaces(post);
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "post.update", targetType: "post", targetId: id, request });
    console.info({ route: "/api/posts/[id]", action: "update", userId: user.id, role: user.role, postId: id, ownerId: String(post.authorUserId), authorized: true, mediaChanged: input.mediaIds !== undefined, durationMs: Date.now() - startedAt });
    return ok({ post: await serializePostForResponse(id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const startedAt = Date.now();
  try {
    const user = await requireActiveUser(["party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const parsed = await readJson(request, deleteSchema);
    await connectToDatabase();
    const post = await Post.findById(id);
    if (!post || post.status === "deleted") throw new Error("NOT_FOUND");

    const ownerAuthorized = canDeleteOwnPost(user, post);
    const moderationAuthorized = isAdmin(user.role) && !ownerAuthorized;
    if (!ownerAuthorized && !moderationAuthorized) {
      console.info({ route: "/api/posts/[id]", action: "delete", userId: user.id, role: user.role, postId: id, ownerId: String(post.authorUserId), authorized: false, durationMs: Date.now() - startedAt });
      return fail("FORBIDDEN", "حذف المحتوى متاح للمالك فقط.", 403);
    }
    if (moderationAuthorized && !parsed.reason) return fail("BAD_REQUEST", "سبب الحذف مطلوب.", 400);

    post.status = "deleted";
    post.deletedAt = new Date();
    post.deletedBy = user.id as never;
    post.moderationReason = parsed.reason || "حذف بواسطة المالك";
    await post.save();
    await revalidatePostSurfaces(post);
    if (post.partyId) await Party.updateOne({ _id: post.partyId, postsCount: { $gt: 0 } }, { $inc: { postsCount: -1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "post.delete", targetType: "post", targetId: id, metadata: { reason: post.moderationReason }, request });
    console.info({ route: "/api/posts/[id]", action: "delete", userId: user.id, role: user.role, postId: id, ownerId: String(post.authorUserId), authorized: true, mediaChanged: false, durationMs: Date.now() - startedAt });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
