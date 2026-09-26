import { connectToDatabase } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { publicComments } from "@/lib/comments";
import { requireActiveUser } from "@/lib/auth";
import { commentSchema } from "@/lib/validators";
import { CommentRejectedError, createModeratedComment } from "@/lib/moderation/createComment";
import { cursorFilter, getNextCursor, newestSort, parseLimit } from "@/lib/pagination";
import { readJsonWithLimit, serialize } from "@/lib/routeUtils";
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
    const { id } = await context.params;
    const input = await readJsonWithLimit(request, commentSchema, 4096);
    const result = await createModeratedComment({ targetType: "poll", targetId: id, userId: user.id, userRole: "citizen", ...input });
    if (result.created) revalidatePath("/updates");
    return ok({ comment: serialize(result.comment), created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof CommentRejectedError) return fail("BAD_REQUEST", error.message, 422);
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") return fail("PAYLOAD_TOO_LARGE", "التعليق طويل جدًا. اختصره وحاول مرة ثانية.", 413);
    return handleApiError(error);
  }
}
