import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { voteSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { isDuplicateKeyError, pollResultsDisclaimer, readJson, serialize } from "@/lib/routeUtils";
import Poll from "@/models/Poll";
import PollVote from "@/models/PollVote";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`vote:${user.id}`, 30, 60 * 60 * 1000);
    const { id } = await context.params;
    const input = await readJson(request, voteSchema);
    await connectToDatabase();
    const poll = await Poll.findOne({ _id: id, status: "active" });
    if (!poll) throw new Error("NOT_FOUND");
    if (poll.expiresAt && poll.expiresAt.getTime() <= Date.now()) return fail("BAD_REQUEST", "انتهت مدة التصويت", 400);
    if (!poll.options.some((option) => String(option._id) === input.optionId)) return fail("BAD_REQUEST", "خيار التصويت غير صالح", 400);

    try {
      await PollVote.create({ pollId: id, userId: user.id, optionId: input.optionId });
    } catch (error) {
      if (isDuplicateKeyError(error)) return fail("CONFLICT", "لقد صوّت سابقا على هذا التصويت ولا يمكن التصويت مرة ثانية", 409);
      throw error;
    }

    await Poll.updateOne(
      { _id: id, "options._id": input.optionId },
      { $inc: { "options.$.votesCount": 1, totalVotes: 1 }, $set: { optionsLockedAt: poll.optionsLockedAt || new Date() } }
    );
    const updated = await Poll.findById(id).lean();
    return ok({ poll: serialize(updated), disclaimer: pollResultsDisclaimer() });
  } catch (error) {
    return handleApiError(error);
  }
}
