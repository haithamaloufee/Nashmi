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
    let updatedPost = post;
    if (!existing) {
      await PostReaction.create({ postId: id, userId: user.id, type: input.type });
      updatedPost = await Post.findByIdAndUpdate(id, { $inc: { [counterFor(input.type)]: 1 } }, { new: true }) || post;
    } else if (existing.type !== input.type) {
      const oldType = existing.type as "like" | "dislike";
      existing.type = input.type;
      await existing.save();
      updatedPost = await Post.findByIdAndUpdate(id, { $inc: { [counterFor(oldType)]: -1, [counterFor(input.type)]: 1 } }, { new: true }) || post;
    }
    return ok({ reacted: true, type: input.type, likesCount: updatedPost.likesCount, dislikesCount: updatedPost.dislikesCount });
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
    let updatedPost = null;
    if (existing) updatedPost = await Post.findOneAndUpdate({ _id: id, [counterFor(existing.type as "like" | "dislike")]: { $gt: 0 } }, { $inc: { [counterFor(existing.type as "like" | "dislike")]: -1 } }, { new: true });
    return ok({ reacted: false, likesCount: updatedPost?.likesCount, dislikesCount: updatedPost?.dislikesCount });
  } catch (error) {
    return handleApiError(error);
  }
}
