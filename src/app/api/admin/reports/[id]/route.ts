import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { moderationSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Report from "@/models/Report";
import ModerationAction from "@/models/ModerationAction";
import Post from "@/models/Post";
import Poll from "@/models/Poll";
import Comment from "@/models/Comment";
import Party from "@/models/Party";

type Context = { params: Promise<{ id: string }> };

async function moderateTarget(targetType: string, targetId: unknown, action: string, reason: string, actorId: string) {
  if (targetType === "post") {
    if (action === "hide") return Post.updateOne({ _id: targetId }, { $set: { status: "hidden", moderationReason: reason } });
    if (action === "delete") return Post.updateOne({ _id: targetId }, { $set: { status: "deleted", deletedAt: new Date(), deletedBy: actorId, moderationReason: reason } });
    if (action === "restore") return Post.updateOne({ _id: targetId }, { $set: { status: "published", moderationReason: null, deletedAt: null, deletedBy: null } });
  }
  if (targetType === "poll") {
    if (action === "hide") return Poll.updateOne({ _id: targetId }, { $set: { status: "hidden" } });
    if (action === "delete") return Poll.updateOne({ _id: targetId }, { $set: { status: "deleted" } });
    if (action === "restore") return Poll.updateOne({ _id: targetId }, { $set: { status: "active" } });
  }
  if (targetType === "comment") {
    const current = await Comment.findById(targetId);
    if (!current) return null;
    const wasPublished = current.status === "published";
    if (action === "hide") {
      current.status = "hidden";
      current.hiddenReason = reason;
      current.moderatedBy = actorId as never;
      current.moderatedAt = new Date();
    }
    if (action === "delete") {
      current.status = "deleted";
      current.deletedAt = new Date();
      current.deletedBy = actorId as never;
      current.hiddenReason = reason;
    }
    if (action === "restore") {
      current.status = "published";
      current.hiddenReason = null;
      current.moderatedBy = null;
      current.moderatedAt = null;
      current.deletedAt = null;
      current.deletedBy = null;
    }
    await current.save();
    const shouldDecrement = wasPublished && (action === "hide" || action === "delete");
    const shouldIncrement = !wasPublished && action === "restore";
    if (shouldDecrement || shouldIncrement) {
      const delta = shouldIncrement ? 1 : -1;
      if (current.targetType === "post") await Post.updateOne({ _id: current.targetId, commentsCount: shouldDecrement ? { $gt: 0 } : { $gte: 0 } }, { $inc: { commentsCount: delta } });
      if (current.targetType === "poll") await Poll.updateOne({ _id: current.targetId, commentsCount: shouldDecrement ? { $gt: 0 } : { $gte: 0 } }, { $inc: { commentsCount: delta } });
    }
    return current;
  }
  if (targetType === "party") {
    if (action === "hide" || action === "delete") return Party.updateOne({ _id: targetId }, { $set: { status: "disabled" } });
    if (action === "restore") return Party.updateOne({ _id: targetId }, { $set: { status: "active" } });
  }
  return null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, moderationSchema);
    await connectToDatabase();
    const report = await Report.findById(id);
    if (!report) throw new Error("NOT_FOUND");

    if (input.action !== "dismiss_report") {
      await moderateTarget(report.targetType, report.targetId, input.action, input.reason, actor.id);
    }

    report.status = input.action === "dismiss_report" ? "dismissed" : "action_taken";
    report.reviewedBy = actor.id as never;
    report.reviewedAt = new Date();
    await report.save();

    const moderation = await ModerationAction.create({
      targetType: report.targetType,
      targetId: report.targetId,
      action: input.action,
      reason: input.reason,
      actorUserId: actor.id
    });

    await writeAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: `moderation.${input.action}`,
      targetType: report.targetType,
      targetId: report.targetId,
      metadata: { reportId: report._id, moderationActionId: moderation._id, reason: input.reason },
      request
    });

    return ok({ report: serialize(report), moderationAction: serialize(moderation) });
  } catch (error) {
    return handleApiError(error);
  }
}
