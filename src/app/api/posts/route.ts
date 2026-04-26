import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { authorTypeForRole, contentCreatorRoles } from "@/lib/permissions";
import { postCreateSchema } from "@/lib/validators";
import { createSearchText, searchRegex } from "@/lib/arabicSearch";
import { cursorFilter, getNextCursor, newestSort, parseLimit } from "@/lib/pagination";
import { cleanContent, readJson, requirePartyForUser, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Post from "@/models/Post";
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
    const query: Record<string, unknown> = { status: "published", ...cursorFilter(url.searchParams.get("cursor")) };
    if (partyId) query.partyId = partyId;
    if (filter === "iec") query.authorType = "iec";
    if (regex) query.searchNormalized = regex;
    const posts = await Post.find(query).sort(newestSort).limit(limit).lean();
    return ok({ posts: serialize(posts) }, { nextCursor: getNextCursor(posts, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(contentCreatorRoles);
    const input = await readJson(request, postCreateSchema);
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

    const content = cleanContent(input.content);
    const post = await Post.create({
      authorType: authorTypeForRole(user.role),
      authorUserId: user.id,
      partyId,
      title: input.title || null,
      content,
      tags: input.tags,
      mediaIds: input.mediaIds,
      status: "published",
      visibility: "public",
      publishedAt: new Date(),
      searchNormalized: createSearchText([input.title || "", content, ...(input.tags || [])])
    });
    if (partyId) await Party.updateOne({ _id: partyId }, { $inc: { postsCount: 1 } });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "post.create", targetType: "post", targetId: post._id, metadata: { partyId }, request });
    return ok({ post: serialize(post) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
