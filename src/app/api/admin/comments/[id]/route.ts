import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { moderationSchema } from "@/lib/validators";
import { readJson } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import Poll from "@/models/Poll";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, moderationSchema);
    await connectToDatabase();

    const comment = await Comment.findById(id);
    if (!comment || comment.status === "deleted") throw new Error("NOT_FOUND");

    const publishedBefore = comment.status === "published";
    const statusUpdate: Record<string, unknown> = {
      moderatedBy: actor.id,
      moderatedAt: new Date()
    };

    if (input.action === "hide") {
      statusUpdate.status = "hidden";
      statusUpdate.hiddenReason = input.reason;
    } else if (input.action === "delete") {
      statusUpdate.status = "deleted";
      statusUpdate.deletedAt = new Date();
      statusUpdate.deletedBy = actor.id;
      statusUpdate.hiddenReason = input.reason;
    } else if (input.action === "restore") {
      statusUpdate.status = "published";
      statusUpdate.hiddenReason = null;
      statusUpdate.deletedAt = null;
      statusUpdate.deletedBy = null;
    } else if (input.action === "dismiss_report") {
      statusUpdate.hiddenReason = `بلاغ مرفوض: ${input.reason}`;
    }

    const updatedComment = await Comment.findByIdAndUpdate(id, { $set: statusUpdate }, { new: true }).lean();
    if (!updatedComment) throw new Error("NOT_FOUND");

    if (publishedBefore && updatedComment.status !== "published") {
      if (comment.targetType === "post") {
        await Post.updateOne({ _id: comment.targetId, commentsCount: { $gt: 0 } }, { $inc: { commentsCount: -1 } });
      } else {
        await Poll.updateOne({ _id: comment.targetId, commentsCount: { $gt: 0 } }, { $inc: { commentsCount: -1 } });
      }
    }

    if (!publishedBefore && updatedComment.status === "published") {
      if (comment.targetType === "post") {
        await Post.updateOne({ _id: comment.targetId }, { $inc: { commentsCount: 1 } });
      } else {
        await Poll.updateOne({ _id: comment.targetId }, { $inc: { commentsCount: 1 } });
      }
    }

    await writeAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "comment.moderate",
      targetType: "comment",
      targetId: id,
      metadata: { action: input.action, reason: input.reason },
      request
    });

    return ok({ comment: updatedComment });
  } catch (error) {
    return handleApiError(error);
  }
}
