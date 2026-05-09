import { connectToDatabase } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { requireActiveUser } from "@/lib/auth";
import { authorTypeForRole, contentCreatorRoles } from "@/lib/permissions";
import { attachPublisherSnapshots, buildPublisherSnapshot, getAuthorityAuthor } from "@/lib/publisher";
import { normalizePopulatedMedia } from "@/lib/media";
import { postCreateSchema } from "@/lib/validators";
import { createSearchText, searchRegex } from "@/lib/arabicSearch";
import { cursorFilter, getNextCursor, newestSort, parseLimit } from "@/lib/pagination";
import { cleanContent, readJson, requirePartyForUser, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Post from "@/models/Post";
import Party from "@/models/Party";
import MediaAsset from "@/models/MediaAsset";
import "@/models/User";

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
    const [posts, authorityAuthor] = await Promise.all([Post.find(query)
      .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
      .populate({ path: "authorUserId", select: "name avatarUrl image role" })
      .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
      .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
      .sort(newestSort)
      .limit(limit)
      .lean(), getAuthorityAuthor()]);
    const withPublisher = attachPublisherSnapshots((posts as any[]).map(normalizePopulatedMedia), authorityAuthor);
    return ok(
      { posts: serialize(withPublisher) },
      { nextCursor: getNextCursor(posts, limit), headers: cacheHeaders(CACHE_HEADERS.publicFeed) }
    );
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
    const mediaIds = input.mediaIds || [];
    if (mediaIds.length) {
      const activeMediaCount = await MediaAsset.countDocuments({ _id: { $in: mediaIds }, ownerUserId: user.id, status: "active" });
      if (activeMediaCount !== mediaIds.length) return fail("BAD_REQUEST", "بعض المرفقات غير مكتملة أو لا تخص هذا الحساب", 400);
    }
    const authorType = authorTypeForRole(user.role);
    const publisherSnapshot = await buildPublisherSnapshot({ authorType, partyId, authorUser: user });
    const post = await Post.create({
      authorType,
      authorUserId: user.id,
      partyId,
      publisherSnapshot,
      title: input.title || null,
      content,
      tags: input.tags,
      mediaIds,
      status: "published",
      visibility: "public",
      publishedAt: new Date(),
      searchNormalized: createSearchText([input.title || "", content, ...(input.tags || [])])
    });
    if (partyId) await Party.updateOne({ _id: partyId }, { $inc: { postsCount: 1 } });
    revalidatePath("/updates");
    revalidatePath("/");
    if (publisherSnapshot.href) revalidatePath(publisherSnapshot.href);
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "post.create", targetType: "post", targetId: post._id, metadata: { partyId }, request });
    const populated = await Post.findById(post._id)
      .populate({ path: "authorUserId", select: "name avatarUrl image role" })
      .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
      .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
      .lean();
    const authorityAuthor = await getAuthorityAuthor();
    const [withPublisher] = attachPublisherSnapshots([normalizePopulatedMedia((populated || post) as any)], authorityAuthor);
    return ok({ post: serialize(withPublisher) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
