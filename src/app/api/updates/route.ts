import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCurrentUser } from "@/lib/auth";
import { searchRegex } from "@/lib/arabicSearch";
import { parseLimit } from "@/lib/pagination";
import { serialize } from "@/lib/routeUtils";
import Party from "@/models/Party";
import PartyFollower from "@/models/PartyFollower";
import Post from "@/models/Post";
import Poll from "@/models/Poll";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const search = url.searchParams.get("search");
    const filter = url.searchParams.get("filter") || "all";
    const cursor = url.searchParams.get("cursor");
    const cursorDate = cursor ? new Date(cursor) : null;
    const regex = search ? searchRegex(search) : null;
    const partyNameMatches = regex ? await Party.find({ status: "active", searchNormalized: regex }).select("_id").lean() : [];
    const matchingPartyIds = partyNameMatches.map((party) => party._id);

    const basePostQuery: Record<string, unknown> = { status: "published" };
    const basePollQuery: Record<string, unknown> = { status: "active" };
    if (cursorDate && !Number.isNaN(cursorDate.getTime())) {
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

    const [posts, polls] = await Promise.all([
      filter === "polls" ? [] : Post.find(basePostQuery).sort({ publishedAt: -1 }).limit(limit).lean(),
      filter === "posts" ? [] : Poll.find(basePollQuery).sort({ publishedAt: -1 }).limit(limit).lean()
    ]);

    const updates = [
      ...posts.map((post) => ({ type: "post", publishedAt: post.publishedAt, item: post })),
      ...polls.map((poll) => ({ type: "poll", publishedAt: poll.publishedAt, item: poll }))
    ]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);

    const nextCursor = updates.length === limit ? new Date(updates[updates.length - 1].publishedAt).toISOString() : null;
    return ok({ updates: serialize(updates) }, { nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}
