import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { reactionSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/routeUtils";
import Poll from "@/models/Poll";
import PollReaction from "@/models/PollReaction";

type Context = { params: Promise<{ id: string }> };
const counterFor = (type: "like" | "dislike") => (type === "like" ? "likesCount" : "dislikesCount");

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`poll-reaction:${user.id}`, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    const input = await readJson(request, reactionSchema);
    await connectToDatabase();
    const poll = await Poll.findOne({ _id: id, status: "active" });
    if (!poll) throw new Error("NOT_FOUND");
    const existing = await PollReaction.findOne({ pollId: id, userId: user.id });
    let updatedPoll = poll;
    if (!existing) {
      await PollReaction.create({ pollId: id, userId: user.id, type: input.type });
      updatedPoll = await Poll.findByIdAndUpdate(id, { $inc: { [counterFor(input.type)]: 1 } }, { new: true }) || poll;
    } else if (existing.type !== input.type) {
      const oldType = existing.type as "like" | "dislike";
      existing.type = input.type;
      await existing.save();
      updatedPoll = await Poll.findByIdAndUpdate(id, { $inc: { [counterFor(oldType)]: -1, [counterFor(input.type)]: 1 } }, { new: true }) || poll;
    }
    return ok({ reacted: true, type: input.type, likesCount: updatedPoll.likesCount, dislikesCount: updatedPoll.dislikesCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`poll-reaction:${user.id}`, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    await connectToDatabase();
    const existing = await PollReaction.findOneAndDelete({ pollId: id, userId: user.id });
    let updatedPoll = null;
    if (existing) updatedPoll = await Poll.findOneAndUpdate({ _id: id, [counterFor(existing.type as "like" | "dislike")]: { $gt: 0 } }, { $inc: { [counterFor(existing.type as "like" | "dislike")]: -1 } }, { new: true });
    return ok({ reacted: false, likesCount: updatedPoll?.likesCount, dislikesCount: updatedPoll?.dislikesCount });
  } catch (error) {
    return handleApiError(error);
  }
}
