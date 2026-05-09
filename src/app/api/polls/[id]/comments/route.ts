import { connectToDatabase } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ok, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { publicComments, publicComment } from "@/lib/comments";
import { requireActiveUser } from "@/lib/auth";
import { commentSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { cursorFilter, getNextCursor, newestSort, parseLimit } from "@/lib/pagination";
import { cleanContent, readJson, serialize } from "@/lib/routeUtils";
import Poll from "@/models/Poll";
import Comment from "@/models/Comment";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    await connectToDatabase();
    const [pollExists, comments] = await Promise.all([
      Poll.exists({ _id: id, status: "active" }),
      Comment.find({ targetType: "poll", targetId: id, status: "published", ...cursorFilter(url.searchParams.get("cursor")) })
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .sort(newestSort)
        .limit(limit)
        .lean()
    ]);
    if (!pollExists) throw new Error("NOT_FOUND");
    return ok(
      { comments: serialize(publicComments(comments as any[])) },
      { nextCursor: getNextCursor(comments, limit), headers: cacheHeaders(CACHE_HEADERS.publicComments) }
    );
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
    const poll = await Poll.findOne({ _id: id, status: "active" });
    if (!poll) throw new Error("NOT_FOUND");
    const comment = await Comment.create({
      targetType: "poll",
      targetId: id,
      authorUserId: user.id,
      authorRoleSnapshot: user.role,
      partyId: null,
      content: cleanContent(input.content)
    });
    await Poll.updateOne({ _id: id }, { $inc: { commentsCount: 1 } });
    revalidatePath("/updates");
    const populated = await Comment.findById(comment._id).populate({ path: "authorUserId", select: "name avatarUrl image role" }).lean();
    return ok({ comment: serialize(publicComment((populated || comment) as any)) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
