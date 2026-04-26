import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { reportSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Report from "@/models/Report";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import Poll from "@/models/Poll";
import Party from "@/models/Party";

async function reportTargetExists(targetType: string, targetId: string) {
  if (targetType === "post") return Boolean(await Post.exists({ _id: targetId, status: "published" }));
  if (targetType === "poll") return Boolean(await Poll.exists({ _id: targetId, status: "active" }));
  if (targetType === "comment") return Boolean(await Comment.exists({ _id: targetId, status: "published" }));
  if (targetType === "party") return Boolean(await Party.exists({ _id: targetId, status: "active" }));
  return false;
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`report:${user.id}`, 10, 60 * 60 * 1000);
    const input = await readJson(request, reportSchema);
    await connectToDatabase();
    if (!(await reportTargetExists(input.targetType, input.targetId))) {
      return fail("NOT_FOUND", "لا يمكن إنشاء بلاغ لهدف غير موجود أو غير منشور", 404);
    }
    const report = await Report.create({
      targetType: input.targetType,
      targetId: input.targetId,
      reporterUserId: user.id,
      reason: input.reason,
      details: input.details || null,
      status: "open"
    });
    if (input.targetType === "comment") await Comment.updateOne({ _id: input.targetId }, { $inc: { reportsCount: 1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "report.create", targetType: input.targetType, targetId: input.targetId, metadata: { reportId: report._id, reason: input.reason }, request });
    return ok({ report: serialize(report) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
