import { connectToDatabase } from "@/lib/db";
import { searchRegex } from "@/lib/arabicSearch";
import { serialize } from "@/lib/routeUtils";
import Party from "@/models/Party";
import Post from "@/models/Post";
import Poll from "@/models/Poll";
import Law from "@/models/Law";
import User from "@/models/User";
import Report from "@/models/Report";
import AuditLog from "@/models/AuditLog";
import Comment from "@/models/Comment";
import PartyFollower from "@/models/PartyFollower";

function logSafeDataError(error: unknown) {
  if (!(error instanceof Error)) {
    console.error({ name: "UnknownError" });
    return;
  }

  console.error({
    name: error.name,
    message: error.message.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<credentials>@")
  });
}

export async function safeData<T>(fallback: T, loader: () => Promise<T>) {
  try {
    await connectToDatabase();
    return await loader();
  } catch (error) {
    logSafeDataError(error);
    return fallback;
  }
}

export async function getHomeData() {
  return safeData(
    { partiesCount: 0, lawsCount: 0, updatesCount: 0, latestPosts: [] as unknown[], latestPolls: [] as unknown[] },
    async () => {
      const [partiesCount, lawsCount, postsCount, pollsCount, latestPosts, latestPolls] = await Promise.all([
        Party.countDocuments({ status: "active" }),
        Law.countDocuments({ status: "published" }),
        Post.countDocuments({ status: "published" }),
        Poll.countDocuments({ status: "active" }),
        Post.find({ status: "published" }).sort({ publishedAt: -1 }).limit(3).lean(),
        Poll.find({ status: "active" }).sort({ publishedAt: -1 }).limit(2).lean()
      ]);
      return { partiesCount, lawsCount, updatesCount: postsCount + pollsCount, latestPosts: serialize(latestPosts), latestPolls: serialize(latestPolls) };
    }
  );
}

export async function getPublicParties(search?: string) {
  return safeData([] as unknown[], async () => {
    const regex = search ? searchRegex(search) : null;
    const query = regex ? { status: "active", searchNormalized: regex } : { status: "active" };
    const parties = await Party.find(query).sort({ slug: 1 }).lean();
    return serialize(parties);
  });
}

export async function getPartyBySlug(slug: string, viewerUserId?: string) {
  return safeData(null as unknown, async () => {
    const party = await Party.findOne({ slug, status: "active" }).lean();
    if (!party) return null;
    const [posts, polls, follow] = await Promise.all([
      Post.find({ partyId: party._id, status: "published" }).sort({ publishedAt: -1 }).limit(10).lean(),
      Poll.find({ partyId: party._id, status: "active" }).sort({ publishedAt: -1 }).limit(10).lean(),
      viewerUserId ? PartyFollower.exists({ partyId: party._id, userId: viewerUserId }) : null
    ]);
    return serialize({ party, posts, polls, isFollowing: Boolean(follow) });
  });
}

export async function getUpdates(search?: string, filter = "all") {
  return safeData([] as unknown[], async () => {
    const regex = search ? searchRegex(search) : null;
    const postQuery: Record<string, unknown> = { status: "published" };
    const pollQuery: Record<string, unknown> = { status: "active" };
    if (filter === "iec") {
      postQuery.authorType = "iec";
      pollQuery.authorType = "iec";
    }
    if (regex) {
      postQuery.searchNormalized = regex;
      pollQuery.searchNormalized = regex;
    }
    const [posts, polls] = await Promise.all([
      filter === "polls" ? [] : Post.find(postQuery).sort({ publishedAt: -1 }).limit(12).lean(),
      filter === "posts" ? [] : Poll.find(pollQuery).sort({ publishedAt: -1 }).limit(12).lean()
    ]);
    return serialize(
      [
        ...posts.map((post) => ({ type: "post", publishedAt: post.publishedAt, item: post })),
        ...polls.map((poll) => ({ type: "poll", publishedAt: poll.publishedAt, item: poll }))
      ]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 18)
    );
  });
}

export async function getPublicLaws(search?: string, category?: string) {
  return safeData({ laws: [] as unknown[], categories: [] as string[] }, async () => {
    const regex = search ? searchRegex(search) : null;
    const query: Record<string, unknown> = { status: "published" };
    if (category) query.category = category;
    if (regex) query.searchNormalized = regex;
    const [laws, categories] = await Promise.all([
      Law.find(query).sort({ createdAt: -1 }).limit(50).lean(),
      Law.distinct("category", { status: "published" })
    ]);
    return { laws: serialize(laws), categories };
  });
}

export async function getLawBySlug(slug: string) {
  return safeData(null as unknown, async () => {
    const law = await Law.findOne({ slug, status: "published" }).lean();
    return law ? serialize(law) : null;
  });
}

export async function getAdminStats() {
  return safeData(
    { users: 0, parties: 0, reports: 0, laws: 0, openReports: [] as unknown[], auditLogs: [] as unknown[] },
    async () => {
      const [users, parties, reports, laws, openReports, auditLogs] = await Promise.all([
        User.countDocuments(),
        Party.countDocuments(),
        Report.countDocuments(),
        Law.countDocuments(),
        Report.find({ status: "open" }).sort({ createdAt: -1 }).limit(8).lean(),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean()
      ]);
      return { users, parties, reports, laws, openReports: serialize(openReports), auditLogs: serialize(auditLogs) };
    }
  );
}

export async function getDashboardLists() {
  return safeData(
    { users: [] as unknown[], parties: [] as unknown[], reports: [] as unknown[], laws: [] as unknown[], auditLogs: [] as unknown[] },
    async () => {
      const [users, parties, reports, laws, auditLogs] = await Promise.all([
        User.find({}).select("-passwordHash").sort({ createdAt: -1 }).limit(100).lean(),
        Party.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        Report.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        Law.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean()
      ]);
      return { users: serialize(users), parties: serialize(parties), reports: serialize(reports), laws: serialize(laws), auditLogs: serialize(auditLogs) };
    }
  );
}

export async function getPartyDashboardData(userId: string) {
  return safeData(null as unknown, async () => {
    const party = await Party.findOne({ accountUserId: userId }).lean();
    if (!party) return null;
    const [posts, polls, comments] = await Promise.all([
      Post.find({ partyId: party._id, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).limit(50).lean(),
      Poll.find({ partyId: party._id, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).limit(50).lean(),
      Comment.countDocuments({ partyId: party._id, status: "published" })
    ]);
    return serialize({ party, posts, polls, comments });
  });
}

export async function getIecDashboardData() {
  return safeData({ posts: [] as unknown[], laws: [] as unknown[] }, async () => {
    const [posts, laws] = await Promise.all([
      Post.find({ authorType: "iec", status: { $ne: "deleted" } }).sort({ createdAt: -1 }).limit(50).lean(),
      Law.find({}).sort({ updatedAt: -1 }).limit(50).lean()
    ]);
    return { posts: serialize(posts), laws: serialize(laws) };
  });
}
