import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { pollUpdateSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { canEditOwnedContent, pollResultsDisclaimer, readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Poll from "@/models/Poll";
import Party from "@/models/Party";

type Context = { params: Promise<{ id: string }> };
const deleteSchema = z.object({ reason: z.string().trim().min(3).max(1000).optional() });

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const poll = await Poll.findOne({ _id: id, status: "active" }).lean();
    if (!poll) throw new Error("NOT_FOUND");
    return ok({ poll: serialize(poll), disclaimer: pollResultsDisclaimer() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, pollUpdateSchema);
    await connectToDatabase();
    const poll = await Poll.findById(id);
    if (!poll || poll.status === "deleted") throw new Error("NOT_FOUND");
    if (!canEditOwnedContent(user, poll)) return fail("FORBIDDEN", "لا يمكنك تعديل تصويت لا تملكه", 403);

    const update: Record<string, unknown> = {};
    if (input.question !== undefined) update.question = input.question;
    if (input.description !== undefined) update.description = input.description || null;
    if (input.resultsVisibility !== undefined) update.resultsVisibility = input.resultsVisibility;
    if (input.expiresAt !== undefined) update.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.status !== undefined && (isAdmin(user.role) || String(poll.authorUserId) === user.id)) update.status = input.status;
    if (input.options !== undefined) {
      if (poll.totalVotes > 0) return fail("BAD_REQUEST", "لا يمكن تعديل الخيارات بعد أول تصويت", 400);
      const uniqueOptions = new Set(input.options.map((option) => option.trim()));
      if (uniqueOptions.size !== input.options.length) return fail("BAD_REQUEST", "لا يمكن تكرار خيارات التصويت", 400);
      update.options = input.options.map((text) => ({ text, votesCount: 0 }));
    }
    update.searchNormalized = createSearchText([String(update.question ?? poll.question), String(update.description ?? poll.description ?? ""), ...((input.options as string[] | undefined) || poll.options.map((option) => option.text))]);
    const updated = await Poll.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "poll.update", targetType: "poll", targetId: id, request });
    return ok({ poll: serialize(updated), disclaimer: pollResultsDisclaimer() });
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
    const poll = await Poll.findById(id);
    if (!poll || poll.status === "deleted") throw new Error("NOT_FOUND");
    if (!canEditOwnedContent(user, poll)) return fail("FORBIDDEN", "لا يمكنك حذف تصويت لا تملكه", 403);
    if (isAdmin(user.role) && String(poll.authorUserId) !== user.id && !parsed.reason) return fail("BAD_REQUEST", "سبب الحذف مطلوب", 400);
    poll.status = "deleted";
    await poll.save();
    if (poll.partyId) await Party.updateOne({ _id: poll.partyId, pollsCount: { $gt: 0 } }, { $inc: { pollsCount: -1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "poll.delete", targetType: "poll", targetId: id, metadata: { reason: parsed.reason || "حذف بواسطة المالك" }, request });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
