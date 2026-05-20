import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { searchRegex } from "@/lib/arabicSearch";
import { parseLimit } from "@/lib/pagination";
import { attachPublisherSnapshots, getAuthorityAuthor } from "@/lib/publisher";
import { normalizePopulatedMediaItems } from "@/lib/media";
import { normalizeHashtag, textHasHashtag } from "@/lib/localization";
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
    const pollStatus = url.searchParams.get("status") || "all";
    const sort = url.searchParams.get("sort") || "newest";
    const hashtag = normalizeHashtag(url.searchParams.get("hashtag") || "");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const cursor = url.searchParams.get("cursor");
    const since = url.searchParams.get("since");
    const cursorDate = cursor ? new Date(cursor) : null;
    const sinceDate = since ? new Date(since) : null;
    const regex = search ? searchRegex(search) : null;
    const partyNameMatches = regex ? await Party.find({ status: "active", searchNormalized: regex }).select("_id").lean() : [];
    const matchingPartyIds = partyNameMatches.map((party) => party._id);

    const basePostQuery: Record<string, unknown> = { status: "published" };
    const basePollQuery: Record<string, unknown> = { status: { $in: ["active", "closed"] } };
    const publishedAtRange: Record<string, Date> = {};
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && !Number.isNaN(fromDate.getTime())) publishedAtRange.$gte = fromDate;
    if (toDate && !Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      publishedAtRange.$lte = toDate;
    }
    if (Object.keys(publishedAtRange).length) {
      basePostQuery.publishedAt = publishedAtRange;
      basePollQuery.publishedAt = publishedAtRange;
    }
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
    if (filter === "parties") {
      basePostQuery.authorType = "party";
      basePollQuery.authorType = "party";
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
    if (hashtag) {
      const hashtagRegex = new RegExp(`#${hashtag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      basePostQuery.$and = [...((basePostQuery.$and as unknown[]) || []), { $or: [{ content: hashtagRegex }, { title: hashtagRegex }, { tags: hashtagRegex }] }];
      basePollQuery.$and = [...((basePollQuery.$and as unknown[]) || []), { $or: [{ question: hashtagRegex }, { description: hashtagRegex }] }];
    }
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (pollStatus === "open") basePollQuery.status = "active";
    if (pollStatus === "closed") basePollQuery.status = "closed";
    if (pollStatus === "closingSoon") {
      basePollQuery.status = "active";
      basePollQuery.$and = [...((basePollQuery.$and as unknown[]) || []), { $or: [{ endsAt: { $gte: now, $lte: soon } }, { expiresAt: { $gte: now, $lte: soon } }] }];
    }

    const fetchLimit = sort === "newest" || sort === "oldest" ? limit : Math.max(limit * 4, 40);

    const includePosts = filter !== "polls";
    const includePolls = filter !== "posts";

    const [posts, polls, postsCount, pollsCount, authorityAuthor] = await Promise.all([
      !includePosts
        ? []
        : Post.find(basePostQuery)
            .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
            .sort({ publishedAt: -1 })
            .limit(fetchLimit)
            .lean(),
      !includePolls
        ? []
        : Poll.find(basePollQuery)
            .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .sort({ publishedAt: -1 })
            .limit(fetchLimit)
            .lean(),
      includePosts ? Post.countDocuments(basePostQuery) : 0,
      includePolls ? Poll.countDocuments(basePollQuery) : 0,
      getAuthorityAuthor()
    ]);

    const withPublisher = <T extends Record<string, any>>(items: T[]) =>
      attachPublisherSnapshots(items, authorityAuthor).map((item) => (item.authorType === "iec" ? { ...item, authorityAuthor } : item));

    let updates = [
      ...withPublisher(normalizePopulatedMediaItems(posts as any[])).map((post) => ({ type: "post", publishedAt: post.publishedAt, item: post })),
      ...withPublisher(normalizePopulatedMediaItems(polls as any[])).map((poll) => ({ type: "poll", publishedAt: poll.publishedAt, item: poll }))
    ];

    if (hashtag) {
      updates = updates.filter((update) => {
        const item = update.item;
        if (update.type === "post") return textHasHashtag(`${item.title || ""}\n${item.content || ""}\n${(item.tags || []).map((tag: string) => `#${tag}`).join(" ")}`, hashtag);
        return textHasHashtag(`${item.question || ""}\n${item.description || ""}`, hashtag);
      });
    }

    updates = updates.sort((a, b) => {
      const aItem = a.item || {};
      const bItem = b.item || {};
      if (sort === "oldest") return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      if (sort === "mostCommented") return (bItem.commentsCount || 0) - (aItem.commentsCount || 0);
      if (sort === "mostLiked") return (bItem.likesCount || 0) - (aItem.likesCount || 0);
      if (sort === "pollsEndingSoon") {
        const aEnd = a.type === "poll" ? new Date(aItem.endsAt || aItem.expiresAt || 8640000000000000).getTime() : 8640000000000000;
        const bEnd = b.type === "poll" ? new Date(bItem.endsAt || bItem.expiresAt || 8640000000000000).getTime() : 8640000000000000;
        return aEnd - bEnd;
      }
      if (sort === "openPollsFirst") {
        const aOpen = a.type === "poll" && aItem.status === "active" ? 1 : 0;
        const bOpen = b.type === "poll" && bItem.status === "active" ? 1 : 0;
        return bOpen - aOpen || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const totalCount = hashtag ? updates.length : postsCount + pollsCount;
    updates = updates.slice(0, limit);

    const supportsCursor = sort === "newest";
    const nextCursor = supportsCursor && !sinceDate && updates.length === limit ? new Date(updates[updates.length - 1].publishedAt).toISOString() : null;
    return ok(
      { updates: serialize(updates), totalCount },
      { nextCursor, headers: filter === "followed" || sinceDate ? undefined : cacheHeaders(CACHE_HEADERS.publicFeed) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
