import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { searchRegex } from "@/lib/arabicSearch";
import { parseLimit } from "@/lib/pagination";
import { attachPublisherSnapshots, getAuthorityAuthor } from "@/lib/publisher";
import { normalizePopulatedMediaItems } from "@/lib/media";
import { serialize } from "@/lib/routeUtils";
import Party from "@/models/Party";
import PartyFollower from "@/models/PartyFollower";
import Post from "@/models/Post";
import Poll from "@/models/Poll";
import "@/models/MediaAsset";
import "@/models/User";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const search = url.searchParams.get("search");
    const filter = url.searchParams.get("filter") || "all";
    const cursor = url.searchParams.get("cursor");
    const since = url.searchParams.get("since");
    const cursorDate = cursor ? new Date(cursor) : null;
    const sinceDate = since ? new Date(since) : null;
    const regex = search ? searchRegex(search) : null;
    const partyNameMatches = regex ? await Party.find({ status: "active", searchNormalized: regex }).select("_id").lean() : [];
    const matchingPartyIds = partyNameMatches.map((party) => party._id);

    const basePostQuery: Record<string, unknown> = { status: "published" };
    const basePollQuery: Record<string, unknown> = { status: { $in: ["active", "closed"] } };
    if (sinceDate && !Number.isNaN(sinceDate.getTime())) {
      basePostQuery.publishedAt = { $gt: sinceDate };
      basePollQuery.publishedAt = { $gt: sinceDate };
    } else if (cursorDate && !Number.isNaN(cursorDate.getTime())) {
      basePostQuery.publishedAt = { $lt: cursorDate };
      basePollQuery.publishedAt = { $lt: cursorDate };
    }
    if (filter === "iec") {
      basePostQuery.authorType = "iec";
      basePollQuery.authorType = "iec";
    }
    if (filter === "followed") {
      const user = await getCurrentUser();
      if (!user) return fail("UNAUTHORIZED", "للحفاظ على نزاهة التفاعل ومنع التكرار، يرجى تسجيل الدخول.", 401);
      const follows = await PartyFollower.find({ userId: user.id }).select("partyId").lean();
      const ids = follows.map((follow) => follow.partyId);
      basePostQuery.partyId = { $in: ids };
      basePollQuery.partyId = { $in: ids };
    }
    if (regex) {
      const searchClause = [{ searchNormalized: regex }, { partyId: { $in: matchingPartyIds } }];
      basePostQuery.$or = searchClause;
      basePollQuery.$or = searchClause;
    }

    const [posts, polls, authorityAuthor] = await Promise.all([
      filter === "polls"
        ? []
        : Post.find(basePostQuery)
            .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
            .sort({ publishedAt: -1 })
            .limit(limit)
            .lean(),
      filter === "posts"
        ? []
        : Poll.find(basePollQuery)
            .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .sort({ publishedAt: -1 })
            .limit(limit)
            .lean(),
      getAuthorityAuthor()
    ]);

    const withPublisher = <T extends Record<string, any>>(items: T[]) =>
      attachPublisherSnapshots(items, authorityAuthor).map((item) => (item.authorType === "iec" ? { ...item, authorityAuthor } : item));

    const updates = [
      ...withPublisher(normalizePopulatedMediaItems(posts as any[])).map((post) => ({ type: "post", publishedAt: post.publishedAt, item: post })),
      ...withPublisher(normalizePopulatedMediaItems(polls as any[])).map((poll) => ({ type: "poll", publishedAt: poll.publishedAt, item: poll }))
    ]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);

    const nextCursor = sinceDate ? null : updates.length === limit ? new Date(updates[updates.length - 1].publishedAt).toISOString() : null;
    return ok(
      { updates: serialize(updates) },
      { nextCursor, headers: filter === "followed" || sinceDate ? undefined : cacheHeaders(CACHE_HEADERS.publicFeed) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
