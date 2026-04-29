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
import AuthorityProfile from "@/models/AuthorityProfile";
import "@/models/MediaAsset";
import PostReaction from "@/models/PostReaction";
import PollReaction from "@/models/PollReaction";
import PollVote from "@/models/PollVote";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactSearch(value: string | null | undefined) {
  return String(value || "").trim().slice(0, 120);
}

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
    const parties = await Party.find(query).populate({ path: "logoMediaId", select: "url status" }).sort({ slug: 1 }).lean();
    return serialize(parties);
  });
}

export async function getPartyBySlug(slug: string, viewerUserId?: string) {
  return safeData(null as unknown, async () => {
    const party = await Party.findOne({ slug, status: "active" }).populate({ path: "logoMediaId", select: "url status" }).lean();
    if (!party) return null;
    const [posts, polls, follow] = await Promise.all([
      Post.find({ partyId: party._id, status: "published" }).sort({ publishedAt: -1 }).limit(10).lean(),
      Poll.find({ partyId: party._id, status: "active" }).sort({ publishedAt: -1 }).limit(10).lean(),
      viewerUserId ? PartyFollower.exists({ partyId: party._id, userId: viewerUserId }) : null
    ]);
    return serialize({ party, posts, polls, isFollowing: Boolean(follow) });
  });
}

export async function getAuthorityProfileBySlug(slug: string) {
  return safeData(null as unknown, async () => {
    const authority = await AuthorityProfile.findOne({ slug, status: "active" }).populate({ path: "logoMediaId", select: "url status" }).lean();
    return authority ? serialize(authority) : null;
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

type AdminStats = {
  users: number;
  activeUsers: number;
  citizens: number;
  partyAccounts: number;
  iecAccounts: number;
  adminAccounts: number;
  parties: number;
  verifiedParties: number;
  posts: number;
  polls: number;
  comments: number;
  postReactions: number;
  pollReactions: number;
  pollVotes: number;
  partyFollowers: number;
  chatSessions: number;
  chatMessages: number;
  auditLogs: number;
  openReports: unknown[];
  recentAuditLogs: unknown[];
  postsList: unknown[];
  reports: number;
  laws: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  return safeData(
    { users: 0, activeUsers: 0, citizens: 0, partyAccounts: 0, iecAccounts: 0, adminAccounts: 0, parties: 0, verifiedParties: 0, posts: 0, polls: 0, comments: 0, postReactions: 0, pollReactions: 0, pollVotes: 0, partyFollowers: 0, chatSessions: 0, chatMessages: 0, auditLogs: 0, openReports: [], recentAuditLogs: [], postsList: [], reports: 0, laws: 0 } as AdminStats,
    async () => {
      const [users, activeUsers, citizens, partyAccounts, iecAccounts, adminAccounts, parties, verifiedParties, posts, polls, comments, postReactions, pollReactions, pollVotes, partyFollowers, chatSessions, chatMessages, auditLogsCount, openReports, auditLogs, postsList, reports, laws] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: "active" }),
        User.countDocuments({ role: "citizen" }),
        User.countDocuments({ role: "party", status: "active" }),
        User.countDocuments({ role: "iec" }),
        User.countDocuments({ role: { $in: ["admin", "super_admin"] } }),
        Party.countDocuments({ status: "active" }),
        Party.countDocuments({ status: "active", isVerified: true }),
        Post.countDocuments({ status: { $ne: "deleted" } }),
        Poll.countDocuments({ status: { $ne: "deleted" } }),
        Comment.countDocuments({ status: { $ne: "deleted" } }),
        PostReaction.countDocuments(),
        PollReaction.countDocuments(),
        PollVote.countDocuments(),
        PartyFollower.countDocuments(),
        ChatSession.countDocuments(),
        ChatMessage.countDocuments(),
        AuditLog.countDocuments(),
        Report.find({ status: "open" }).sort({ createdAt: -1 }).limit(8).lean(),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
        Post.find({}).sort({ createdAt: -1 }).limit(10).lean(),
        Report.countDocuments(),
        Law.countDocuments()
      ]);
      return { 
        users, 
        activeUsers, 
        citizens, 
        partyAccounts, 
        iecAccounts, 
        adminAccounts, 
        parties, 
        verifiedParties, 
        posts, 
        polls, 
        comments, 
        postReactions, 
        pollReactions, 
        pollVotes, 
        partyFollowers, 
        chatSessions, 
        chatMessages, 
        auditLogs: auditLogsCount, 
        openReports: serialize(openReports), 
        recentAuditLogs: serialize(auditLogs),
        postsList: serialize(postsList),
        reports,
        laws
      };
    }
  );
}

type AdminPartyFilters = {
  status?: string;
  verified?: string;
  q?: string;
};

export async function getAdminParties(filters: AdminPartyFilters = {}) {
  return safeData({ parties: [] as unknown[], count: 0 }, async () => {
    const status = filters.status || "active";
    const query: Record<string, unknown> = {};
    if (status !== "all") query.status = status;
    if (filters.verified === "true") query.isVerified = true;
    if (filters.verified === "false") query.isVerified = false;

    const search = compactSearch(filters.q);
    if (search) {
      const rawRegex = new RegExp(escapeRegex(search), "i");
      const normalizedRegex = searchRegex(search);
      query.$or = [
        { name: rawRegex },
        { slug: rawRegex },
        ...(normalizedRegex ? [{ searchNormalized: normalizedRegex }] : [])
      ];
    }

    const parties = await Party.find(query)
      .populate({ path: "accountUserId", select: "email status role" })
      .sort({ status: 1, slug: 1 })
      .limit(100)
      .lean();
    return { parties: serialize(parties), count: parties.length };
  });
}

type AdminModerationFilters = {
  type?: string;
  q?: string;
  status?: string;
};

export async function getAdminModerationData(filters: AdminModerationFilters = {}) {
  return safeData(
    { posts: [] as unknown[], comments: [] as unknown[], polls: [] as unknown[], reports: [] as unknown[] },
    async () => {
      const type = filters.type || "posts";
      const search = compactSearch(filters.q);
      const normalizedRegex = search ? searchRegex(search) : null;
      const rawRegex = search ? new RegExp(escapeRegex(search), "i") : null;
      const status = compactSearch(filters.status);

      const postQuery: Record<string, unknown> = {};
      const commentQuery: Record<string, unknown> = {};
      const pollQuery: Record<string, unknown> = {};
      const reportQuery: Record<string, unknown> = {};

      if (status) {
        postQuery.status = status;
        commentQuery.status = status;
        pollQuery.status = status;
        reportQuery.status = status;
      }
      if (rawRegex || normalizedRegex) {
        postQuery.$or = [
          ...(rawRegex ? [{ title: rawRegex }, { content: rawRegex }] : []),
          ...(normalizedRegex ? [{ searchNormalized: normalizedRegex }] : [])
        ];
        commentQuery.content = rawRegex;
        pollQuery.$or = [
          ...(rawRegex ? [{ question: rawRegex }, { description: rawRegex }] : []),
          ...(normalizedRegex ? [{ searchNormalized: normalizedRegex }] : [])
        ];
        reportQuery.$or = rawRegex ? [{ reason: rawRegex }, { details: rawRegex }, { targetType: rawRegex }] : [];
      }

      const [posts, comments, polls, reports] = await Promise.all([
        type === "posts" ? Post.find(postQuery).sort({ createdAt: -1 }).limit(50).lean() : Promise.resolve([]),
        type === "comments" ? Comment.find(commentQuery).sort({ createdAt: -1 }).limit(50).lean() : Promise.resolve([]),
        type === "polls" ? Poll.find(pollQuery).sort({ createdAt: -1 }).limit(50).lean() : Promise.resolve([]),
        type === "reports" ? Report.find(reportQuery).sort({ createdAt: -1 }).limit(50).lean() : Promise.resolve([])
      ]);

      return {
        posts: serialize(posts),
        comments: serialize(comments),
        polls: serialize(polls),
        reports: serialize(reports)
      };
    }
  );
}

export async function getDashboardLists() {
  return safeData(
    { users: [] as unknown[], parties: [] as unknown[], reports: [] as unknown[], laws: [] as unknown[], auditLogs: [] as unknown[], postsList: [] as unknown[], comments: [] as unknown[], polls: [] as unknown[] },
    async () => {
      const [users, parties, reports, laws, auditLogs, postsList, comments, polls] = await Promise.all([
        User.find({}).select("-passwordHash").sort({ createdAt: -1 }).limit(100).lean(),
        Party.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        Report.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        Law.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean(),
        Post.find({}).sort({ createdAt: -1 }).limit(10).lean(),
        Comment.find({}).sort({ createdAt: -1 }).limit(10).lean(),
        Poll.find({}).sort({ createdAt: -1 }).limit(10).lean()
      ]);
      return { users: serialize(users), parties: serialize(parties), reports: serialize(reports), laws: serialize(laws), auditLogs: serialize(auditLogs), postsList: serialize(postsList), comments: serialize(comments), polls: serialize(polls) };
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

export async function getIecProfileData() {
  return safeData(null as unknown, async () => {
    const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission" }).populate({ path: "logoMediaId", select: "url status" }).lean();
    return authority ? serialize(authority) : null;
  });
}
