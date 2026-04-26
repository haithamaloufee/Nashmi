import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { commentSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { cleanContent, readJson, serialize } from "@/lib/routeUtils";
import Post from "@/models/Post";
import Comment from "@/models/Comment";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const comments = await Comment.find({ targetType: "post", targetId: id, status: "published" }).sort({ createdAt: -1 }).limit(100).lean();
    return ok({ comments: serialize(comments) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`comment:${user.id}`, 10, 10 * 60 * 1000);
    const { id } = await context.params;
    const input = await readJson(request, commentSchema);
    await connectToDatabase();
    const post = await Post.findOne({ _id: id, status: "published" });
    if (!post) throw new Error("NOT_FOUND");
    const comment = await Comment.create({
      targetType: "post",
      targetId: id,
      authorUserId: user.id,
      authorRoleSnapshot: user.role,
      partyId: null,
      content: cleanContent(input.content)
    });
    await Post.updateOne({ _id: id }, { $inc: { commentsCount: 1 } });
    return ok({ comment: serialize(comment) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
