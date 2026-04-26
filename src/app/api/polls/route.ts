import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { authorTypeForRole, contentCreatorRoles } from "@/lib/permissions";
import { pollCreateSchema } from "@/lib/validators";
import { createSearchText, searchRegex } from "@/lib/arabicSearch";
import { cursorFilter, getNextCursor, newestSort, parseLimit } from "@/lib/pagination";
import { pollResultsDisclaimer, readJson, requirePartyForUser, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Poll from "@/models/Poll";
import Party from "@/models/Party";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const search = url.searchParams.get("search");
    const partyId = url.searchParams.get("partyId");
    const filter = url.searchParams.get("filter");
    const regex = search ? searchRegex(search) : null;
    const query: Record<string, unknown> = { status: "active", ...cursorFilter(url.searchParams.get("cursor")) };
    if (partyId) query.partyId = partyId;
    if (filter === "iec") query.authorType = "iec";
    if (regex) query.searchNormalized = regex;
    const polls = await Poll.find(query).sort(newestSort).limit(limit).lean();
    return ok({ polls: serialize(polls), disclaimer: pollResultsDisclaimer() }, { nextCursor: getNextCursor(polls, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(contentCreatorRoles);
    const input = await readJson(request, pollCreateSchema);
    const uniqueOptions = new Set(input.options.map((option) => option.trim()));
    if (uniqueOptions.size !== input.options.length) return fail("BAD_REQUEST", "لا يمكن تكرار خيارات التصويت", 400);
    await connectToDatabase();

    let partyId: string | null = null;
    if (user.role === "party") {
      const party = await requirePartyForUser(user.id);
      partyId = party._id.toString();
    } else if (input.partyId) {
      const party = await Party.findById(input.partyId);
      if (!party) return fail("NOT_FOUND", "الحزب غير موجود", 404);
      partyId = party._id.toString();
    }

    const poll = await Poll.create({
      authorType: authorTypeForRole(user.role),
      authorUserId: user.id,
      partyId,
      question: input.question,
      description: input.description || null,
      options: input.options.map((text) => ({ text, votesCount: 0 })),
      pollType: "single_choice",
      allowedVoterRoles: ["citizen"],
      resultsVisibility: input.resultsVisibility,
      allowVoteChange: false,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      status: "active",
      publishedAt: new Date(),
      searchNormalized: createSearchText([input.question, input.description || "", ...input.options])
    });
    if (partyId) await Party.updateOne({ _id: partyId }, { $inc: { pollsCount: 1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "poll.create", targetType: "poll", targetId: poll._id, metadata: { partyId }, request });
    return ok({ poll: serialize(poll), disclaimer: pollResultsDisclaimer() }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
