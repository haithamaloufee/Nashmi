import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { postUpdateSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { canEditOwnedContent, cleanContent, readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Post from "@/models/Post";
import Party from "@/models/Party";

type Context = { params: Promise<{ id: string }> };

const deleteSchema = z.object({ reason: z.string().trim().min(3).max(1000).optional() });

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
  try {
    const user = await requireActiveUser(["party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, postUpdateSchema);
    await connectToDatabase();
    const post = await Post.findById(id);
    if (!post || post.status === "deleted") throw new Error("NOT_FOUND");
    if (!canEditOwnedContent(user, post)) return fail("FORBIDDEN", "لا يمكنك تعديل محتوى لا تملكه", 403);

    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title || null;
    if (input.content !== undefined) update.content = cleanContent(input.content);
    if (input.tags !== undefined) update.tags = input.tags;
    if (input.mediaIds !== undefined) update.mediaIds = input.mediaIds;
    if (input.status !== undefined && isAdmin(user.role)) update.status = input.status;
    update.searchNormalized = createSearchText([String(update.title ?? post.title ?? ""), String(update.content ?? post.content), ...((update.tags as string[] | undefined) || post.tags || [])]);

    const updated = await Post.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "post.update", targetType: "post", targetId: id, request });
    return ok({ post: serialize(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const parsed = await readJson(request, deleteSchema);
    await connectToDatabase();
    const post = await Post.findById(id);
    if (!post || post.status === "deleted") throw new Error("NOT_FOUND");
    if (!canEditOwnedContent(user, post)) return fail("FORBIDDEN", "لا يمكنك حذف محتوى لا تملكه", 403);
    if (isAdmin(user.role) && String(post.authorUserId) !== user.id && !parsed.reason) return fail("BAD_REQUEST", "سبب الحذف مطلوب", 400);

    post.status = "deleted";
    post.deletedAt = new Date();
    post.deletedBy = user.id as never;
    post.moderationReason = parsed.reason || "حذف بواسطة المالك";
    await post.save();
    if (post.partyId) await Party.updateOne({ _id: post.partyId, postsCount: { $gt: 0 } }, { $inc: { postsCount: -1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "post.delete", targetType: "post", targetId: id, metadata: { reason: post.moderationReason }, request });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
