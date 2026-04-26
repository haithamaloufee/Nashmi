import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { reactionSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/routeUtils";
import Post from "@/models/Post";
import PostReaction from "@/models/PostReaction";

type Context = { params: Promise<{ id: string }> };

const counterFor = (type: "like" | "dislike") => (type === "like" ? "likesCount" : "dislikesCount");

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`post-reaction:${user.id}`, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    const input = await readJson(request, reactionSchema);
    await connectToDatabase();
    const post = await Post.findOne({ _id: id, status: "published" });
    if (!post) throw new Error("NOT_FOUND");
    const existing = await PostReaction.findOne({ postId: id, userId: user.id });
    if (!existing) {
      await PostReaction.create({ postId: id, userId: user.id, type: input.type });
      await Post.updateOne({ _id: id }, { $inc: { [counterFor(input.type)]: 1 } });
    } else if (existing.type !== input.type) {
      const oldType = existing.type as "like" | "dislike";
      existing.type = input.type;
      await existing.save();
      await Post.updateOne({ _id: id }, { $inc: { [counterFor(oldType)]: -1, [counterFor(input.type)]: 1 } });
    }
    return ok({ reacted: true, type: input.type });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`post-reaction:${user.id}`, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    await connectToDatabase();
    const existing = await PostReaction.findOneAndDelete({ postId: id, userId: user.id });
    if (existing) await Post.updateOne({ _id: id, [counterFor(existing.type as "like" | "dislike")]: { $gt: 0 } }, { $inc: { [counterFor(existing.type as "like" | "dislike")]: -1 } });
    return ok({ reacted: false });
  } catch (error) {
    return handleApiError(error);
  }
}
