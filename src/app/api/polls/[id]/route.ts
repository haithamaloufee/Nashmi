import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { canDeleteOwnPoll, canEditOwnPoll, isAdmin } from "@/lib/permissions";
import { attachPublisherSnapshots, getAuthorityAuthor } from "@/lib/publisher";
import { pollUpdateSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { pollResultsDisclaimer, readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import { calculatePollEndDate, normalizePollDurationDays } from "@/lib/polls";
import Poll from "@/models/Poll";
import Party from "@/models/Party";

type Context = { params: Promise<{ id: string }> };
const deleteSchema = z.object({ reason: z.string().trim().min(3).max(1000).optional() });

async function revalidatePollSurfaces(poll: { partyId?: unknown; authorType?: string }) {
  revalidatePath("/updates");
  revalidatePath("/");
  if (poll.authorType === "iec") revalidatePath("/iec");
  if (poll.partyId) {
    const party = await Party.findById(poll.partyId).select("slug").lean();
    if (party?.slug) revalidatePath(`/parties/${party.slug}`);
  }
}

async function serializePollForResponse(id: string) {
  const populated = await Poll.findById(id)
    .populate({ path: "authorUserId", select: "name avatarUrl image role" })
    .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
    .lean();
  if (!populated) return null;
  const authorityAuthor = await getAuthorityAuthor();
  const [withPublisher] = attachPublisherSnapshots([populated as any], authorityAuthor);
  return serialize(withPublisher);
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const poll = await Poll.findOne({ _id: id, status: { $in: ["active", "closed"] } }).lean();
    if (!poll) throw new Error("NOT_FOUND");
    return ok({ poll: serialize(poll), disclaimer: pollResultsDisclaimer() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const startedAt = Date.now();
  try {
    const user = await requireActiveUser(["party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, pollUpdateSchema);
    await connectToDatabase();
    const poll = await Poll.findById(id);
    if (!poll || poll.status === "deleted") throw new Error("NOT_FOUND");

    const ownerAuthorized = canEditOwnPoll(user, poll);
    const moderationAuthorized = isAdmin(user.role) && input.status !== undefined && input.question === undefined && input.description === undefined && input.options === undefined && input.resultsVisibility === undefined && input.expiresAt === undefined && input.durationDays === undefined;
    if (!ownerAuthorized && !moderationAuthorized) {
      console.info({ route: "/api/polls/[id]", action: "update", userId: user.id, role: user.role, pollId: id, ownerId: String(poll.authorUserId), authorized: false, durationMs: Date.now() - startedAt });
      return fail("FORBIDDEN", "تعديل التصويت متاح للمالك فقط.", 403);
    }

    const update: Record<string, unknown> = {};
    if (input.question !== undefined && ownerAuthorized) update.question = input.question;
    if (input.description !== undefined && ownerAuthorized) update.description = input.description || null;
    if (input.resultsVisibility !== undefined && ownerAuthorized) update.resultsVisibility = input.resultsVisibility;
    if (input.expiresAt !== undefined && ownerAuthorized) {
      update.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      update.endsAt = update.expiresAt;
    }
    if (input.durationDays !== undefined && ownerAuthorized) {
      const durationDays = normalizePollDurationDays(input.durationDays);
      const start = poll.startsAt || poll.publishedAt || poll.createdAt || new Date();
      const endsAt = calculatePollEndDate(start, durationDays);
      update.durationDays = durationDays;
      update.endsAt = endsAt;
      update.expiresAt = endsAt;
    }
    if (input.status !== undefined && (moderationAuthorized || ownerAuthorized)) update.status = input.status;
    if (input.options !== undefined) {
      if (!ownerAuthorized) return fail("FORBIDDEN", "تعديل خيارات التصويت متاح للمالك فقط.", 403);
      if (poll.totalVotes > 0) return fail("BAD_REQUEST", "لا يمكن تعديل الخيارات بعد أول تصويت.", 400);
      const uniqueOptions = new Set(input.options.map((option) => option.trim()));
      if (uniqueOptions.size !== input.options.length) return fail("BAD_REQUEST", "لا يمكن تكرار خيارات التصويت.", 400);
      update.options = input.options.map((text) => ({ text, votesCount: 0 }));
    }
    update.searchNormalized = createSearchText([String(update.question ?? poll.question), String(update.description ?? poll.description ?? ""), ...((input.options as string[] | undefined) || poll.options.map((option) => option.text))]);
    await Poll.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    await revalidatePollSurfaces(poll);
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "poll.update", targetType: "poll", targetId: id, request });
    console.info({ route: "/api/polls/[id]", action: "update", userId: user.id, role: user.role, pollId: id, ownerId: String(poll.authorUserId), authorized: true, mediaChanged: false, durationMs: Date.now() - startedAt });
    return ok({ poll: await serializePollForResponse(id), disclaimer: pollResultsDisclaimer() });
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
    const poll = await Poll.findById(id);
    if (!poll || poll.status === "deleted") throw new Error("NOT_FOUND");

    const ownerAuthorized = canDeleteOwnPoll(user, poll);
    const moderationAuthorized = isAdmin(user.role) && !ownerAuthorized;
    if (!ownerAuthorized && !moderationAuthorized) {
      console.info({ route: "/api/polls/[id]", action: "delete", userId: user.id, role: user.role, pollId: id, ownerId: String(poll.authorUserId), authorized: false, durationMs: Date.now() - startedAt });
      return fail("FORBIDDEN", "حذف التصويت متاح للمالك فقط.", 403);
    }
    if (moderationAuthorized && !parsed.reason) return fail("BAD_REQUEST", "سبب الحذف مطلوب.", 400);

    poll.status = "deleted";
    await poll.save();
    await revalidatePollSurfaces(poll);
    if (poll.partyId) await Party.updateOne({ _id: poll.partyId, pollsCount: { $gt: 0 } }, { $inc: { pollsCount: -1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "poll.delete", targetType: "poll", targetId: id, metadata: { reason: parsed.reason || "حذف بواسطة المالك" }, request });
    console.info({ route: "/api/polls/[id]", action: "delete", userId: user.id, role: user.role, pollId: id, ownerId: String(poll.authorUserId), authorized: true, mediaChanged: false, durationMs: Date.now() - startedAt });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
