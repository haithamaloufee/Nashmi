import { connectToDatabase } from "@/lib/db";
import { searchRegex } from "@/lib/arabicSearch";
import { normalizeHashtag, textHasHashtag } from "@/lib/localization";
import { attachPublisherSnapshots } from "@/lib/publisher";
import { normalizePopulatedMediaItems } from "@/lib/media";
import { serialize } from "@/lib/routeUtils";
import Party from "@/models/Party";
import Post from "@/models/Post";
import Poll from "@/models/Poll";
import Survey from "@/models/Survey";
import SurveyResponse from "@/models/SurveyResponse";
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
import { buildSurveyResultSummary, canManageSurvey, canRespondToSurvey, canViewSurveyResults, getSurveyLifecycleStatus, surveyIdentifierLookup } from "@/lib/surveys";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactSearch(value: string | null | undefined) {
  return String(value || "").trim().slice(0, 120);
}

type LeanItem = Record<string, unknown>;

function authorityLogo(authority: LeanItem | null | undefined) {
  const logoMedia = authority?.logoMediaId;
  if (logoMedia && typeof logoMedia === "object" && "url" in logoMedia && typeof logoMedia.url === "string") return logoMedia.url;
  return typeof authority?.logoUrl === "string" ? authority.logoUrl : "/related/iec-logo.png";
}

async function getAuthorityAuthor() {
  const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission", status: "active" })
    .populate({ path: "logoMediaId", select: "url status" })
    .select("name logoUrl logoMediaId")
    .lean();
  return {
    name: authority?.name || "الهيئة المستقلة للانتخاب",
    logoUrl: authorityLogo(authority as LeanItem | null)
  };
}

function attachAuthorityAuthor<T extends LeanItem>(items: T[], authorityAuthor: { name: string; logoUrl: string }) {
  return attachPublisherSnapshots(items, authorityAuthor).map((item) => (item.authorType === "iec" ? { ...item, authorityAuthor } : item));
}

function dateTime(value: unknown) {
  return new Date(value instanceof Date || typeof value === "string" || typeof value === "number" ? value : 0).getTime();
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
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
      const [partiesCount, lawsCount, postsCount, pollsCount, latestPosts, latestPolls, authorityAuthor] = await Promise.all([
        Party.countDocuments({ status: "active" }),
        Law.countDocuments({ status: "published" }),
        Post.countDocuments({ status: "published" }),
        Poll.countDocuments({ status: "active" }),
        Post.find({ status: "published" })
          .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
          .populate({ path: "authorUserId", select: "name avatarUrl image role" })
          .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
          .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
          .sort({ publishedAt: -1 })
          .limit(3)
          .lean(),
        Poll.find({ status: { $in: ["active", "closed"] } })
          .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
          .populate({ path: "authorUserId", select: "name avatarUrl image role" })
          .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
          .sort({ publishedAt: -1 })
          .limit(2)
          .lean(),
        getAuthorityAuthor()
      ]);
      return { partiesCount, lawsCount, updatesCount: postsCount + pollsCount, latestPosts: serialize(attachAuthorityAuthor(normalizePopulatedMediaItems(latestPosts as LeanItem[]), authorityAuthor)), latestPolls: serialize(attachAuthorityAuthor(normalizePopulatedMediaItems(latestPolls as LeanItem[]), authorityAuthor)) };
    }
  );
}

export async function getHomeStats() {
  return safeData(
    { partiesCount: 0, lawsCount: 0, updatesCount: 0, postsCount: 0, pollsCount: 0, interactionsCount: 0, usersCount: 0, available: false },
    async () => {
      const [partiesCount, lawsCount, postsCount, pollsCount, commentsCount, postReactionsCount, pollReactionsCount, pollVotesCount, usersCount] = await Promise.all([
        Party.countDocuments({ status: "active" }),
        Law.countDocuments({ status: "published" }),
        Post.countDocuments({ status: "published" }),
        Poll.countDocuments({ status: "active" }),
        Comment.countDocuments({ status: "published" }),
        PostReaction.countDocuments(),
        PollReaction.countDocuments(),
        PollVote.countDocuments(),
        User.countDocuments({ status: "active" })
      ]);
      return {
        partiesCount,
        lawsCount,
        postsCount,
        pollsCount,
        usersCount,
        updatesCount: postsCount + pollsCount,
        interactionsCount: commentsCount + postReactionsCount + pollReactionsCount + pollVotesCount,
        available: true
      };
    }
  );
}

export async function getPublicParties(search?: string) {
  return safeData([] as unknown[], async () => {
    const regex = search ? searchRegex(search) : null;
    const query = regex ? { status: "active", searchNormalized: regex } : { status: "active" };
    const parties = await Party.find(query).populate({ path: "logoMediaId", select: "url status" }).sort({ slug: 1 }).lean();
    return serialize(shuffleItems(parties));
  });
}

export async function getPartyBySlug(slug: string, viewerUserId?: string) {
  return safeData(null as unknown, async () => {
    const party = await Party.findOne({ slug, status: "active" })
      .populate({ path: "logoMediaId", select: "url status" })
      .populate({ path: "coverMediaId", select: "url status" })
      .lean();
    if (!party) return null;
    const [posts, polls, surveys, follow, authorityAuthor] = await Promise.all([
      Post.find({ partyId: party._id, status: "published" })
        .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
        .sort({ publishedAt: -1 })
        .limit(10)
        .lean(),
      Poll.find({ partyId: party._id, status: { $in: ["active", "closed"] } })
        .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort({ publishedAt: -1 })
        .limit(10)
        .lean(),
      Survey.find({ partyId: party._id, status: { $in: ["published", "closed"] } })
        .select("authorType authorUserId partyId publisherSnapshot title slug description totalResponses startsAt endsAt status resultsVisibility publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort({ publishedAt: -1 })
        .limit(6)
        .lean(),
      viewerUserId ? PartyFollower.exists({ partyId: party._id, userId: viewerUserId }) : null,
      getAuthorityAuthor()
    ]);
    return serialize({
      party,
      posts: attachAuthorityAuthor(normalizePopulatedMediaItems(posts as LeanItem[]), authorityAuthor),
      polls: attachAuthorityAuthor(normalizePopulatedMediaItems(polls as LeanItem[]), authorityAuthor),
      surveys: attachAuthorityAuthor(surveys as LeanItem[], authorityAuthor).map((survey) => ({ ...survey, lifecycleStatus: getSurveyLifecycleStatus(survey as never) })),
      isFollowing: Boolean(follow)
    });
  });
}

export async function getAuthorityProfileBySlug(slug: string) {
  return safeData(null as unknown, async () => {
    const authority = await AuthorityProfile.findOne({ slug, status: "active" })
      .populate({ path: "logoMediaId", select: "url status" })
      .populate({ path: "coverMediaId", select: "url status" })
      .lean();
    return authority ? serialize(authority) : null;
  });
}

export async function getAuthorityProfilePageData(slug: string) {
  return safeData(null as unknown, async () => {
    const authority = await AuthorityProfile.findOne({ slug, status: "active" }).populate({ path: "logoMediaId", select: "url status" }).lean();
    if (!authority) return null;
    const [posts, polls, surveys, authorityAuthor] = await Promise.all([
      Post.find({ authorType: "iec", status: "published" })
        .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
        .sort({ publishedAt: -1 })
        .limit(10)
        .lean(),
      Poll.find({ authorType: "iec", status: { $in: ["active", "closed"] } })
        .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort({ publishedAt: -1 })
        .limit(10)
        .lean(),
      Survey.find({ authorType: "iec", status: { $in: ["published", "closed"] } })
        .select("authorType authorUserId partyId publisherSnapshot title slug description totalResponses startsAt endsAt status resultsVisibility publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort({ publishedAt: -1 })
        .limit(6)
        .lean(),
      getAuthorityAuthor()
    ]);
    return serialize({
      authority,
      posts: attachAuthorityAuthor(normalizePopulatedMediaItems(posts as LeanItem[]), authorityAuthor),
      polls: attachAuthorityAuthor(normalizePopulatedMediaItems(polls as LeanItem[]), authorityAuthor),
      surveys: attachAuthorityAuthor(surveys as LeanItem[], authorityAuthor).map((survey) => ({ ...survey, lifecycleStatus: getSurveyLifecycleStatus(survey as never) }))
    });
  });
}

export async function getSurveys(search = "", filter = "all", sort = "newest") {
  return safeData([] as unknown[], async () => {
    const regex = search ? searchRegex(search) : null;
    const query: Record<string, unknown> = { status: { $in: ["published", "closed"] } };
    if (filter === "parties") query.authorType = "party";
    if (filter === "authority") query.authorType = "iec";
    if (filter === "platform") query.authorType = "admin";
    if (regex) query.searchNormalized = regex;
    const [surveys, authorityAuthor] = await Promise.all([
      Survey.find(query)
        .select("authorType authorUserId partyId publisherSnapshot title slug description totalResponses startsAt endsAt status resultsVisibility publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort(sort === "most_participated" ? { totalResponses: -1, publishedAt: -1 } : { publishedAt: -1, createdAt: -1 })
        .limit(80)
        .lean(),
      getAuthorityAuthor()
    ]);
    return serialize(attachAuthorityAuthor(surveys as LeanItem[], authorityAuthor).map((survey) => ({ ...survey, lifecycleStatus: getSurveyLifecycleStatus(survey as never) })));
  });
}

export async function getSurveyBySlug(slug: string, viewer?: { id: string; role: any; status?: string } | null) {
  return safeData(null as unknown, async () => {
    const lookup = surveyIdentifierLookup(slug);
    if (!lookup) return null;
    const survey = await Survey.findOne({ ...lookup, status: { $ne: "deleted" } })
      .populate({ path: "authorUserId", select: "name avatarUrl image role" })
      .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
      .lean();
    if (!survey) return null;
    const isManager = canManageSurvey(viewer as never, survey as never);
    if (!isManager && !["published", "closed"].includes(String(survey.status))) return null;
    const hasResponded = viewer ? Boolean(await SurveyResponse.exists({ surveyId: survey._id, userId: viewer.id })) : false;
    const canViewResults = canViewSurveyResults({ survey: survey as never, viewer: viewer as never, hasResponded, isManager });
    const responses = canViewResults ? await SurveyResponse.find({ surveyId: survey._id }).lean() : [];
    const authorityAuthor = await getAuthorityAuthor();
    const [withPublisher] = attachAuthorityAuthor([survey as LeanItem], authorityAuthor);
    return serialize({
      ...withPublisher,
      lifecycleStatus: getSurveyLifecycleStatus(survey as never),
      hasResponded,
      canRespond: canRespondToSurvey(survey as never, viewer as never, hasResponded),
      canViewResults,
      resultSummary: canViewResults ? buildSurveyResultSummary(survey as never, serialize(responses) as any, isManager) : null
    });
  });
}

export async function getUpdates(search?: string, filter = "all") {
  return safeData([] as unknown[], async () => {
    const regex = search ? searchRegex(search) : null;
    const postQuery: Record<string, unknown> = { status: "published" };
    const pollQuery: Record<string, unknown> = { status: { $in: ["active", "closed"] } };
    const surveyQuery: Record<string, unknown> = { status: { $in: ["published", "closed"] } };
    if (filter === "iec") {
      postQuery.authorType = "iec";
      pollQuery.authorType = "iec";
      surveyQuery.authorType = "iec";
    }
    if (filter === "parties") {
      postQuery.authorType = "party";
      pollQuery.authorType = "party";
      surveyQuery.authorType = "party";
    }
    if (regex) {
      postQuery.searchNormalized = regex;
      pollQuery.searchNormalized = regex;
      surveyQuery.searchNormalized = regex;
    }
    const [posts, polls, surveys, authorityAuthor] = await Promise.all([
      filter === "polls" || filter === "surveys"
        ? []
        : Post.find(postQuery)
            .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
            .sort({ publishedAt: -1 })
            .limit(12)
            .lean(),
      filter === "posts" || filter === "surveys"
        ? []
        : Poll.find(pollQuery)
            .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .sort({ publishedAt: -1 })
            .limit(12)
            .lean(),
      filter === "posts" || filter === "polls"
        ? []
        : Survey.find(surveyQuery)
            .select("authorType authorUserId partyId publisherSnapshot title slug description totalResponses startsAt endsAt status resultsVisibility publishedAt createdAt")
            .populate({ path: "authorUserId", select: "name avatarUrl image role" })
            .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
            .sort({ publishedAt: -1 })
            .limit(12)
            .lean(),
      getAuthorityAuthor()
    ]);
    return serialize(
      [
        ...attachAuthorityAuthor(normalizePopulatedMediaItems(posts as LeanItem[]), authorityAuthor).map((post) => ({ type: "post", publishedAt: post.publishedAt, item: post })),
        ...attachAuthorityAuthor(normalizePopulatedMediaItems(polls as LeanItem[]), authorityAuthor).map((poll) => ({ type: "poll", publishedAt: poll.publishedAt, item: poll })),
        ...attachAuthorityAuthor(surveys as LeanItem[], authorityAuthor).map((survey) => ({
          type: "survey",
          publishedAt: survey.publishedAt || survey.createdAt,
          item: { ...survey, lifecycleStatus: getSurveyLifecycleStatus(survey as never) }
        }))
      ]
        .sort((a, b) => dateTime(b.publishedAt) - dateTime(a.publishedAt))
        .slice(0, 18)
    );
  });
}

export async function getHashtagResults(tag: string) {
  return safeData({ posts: [] as unknown[], polls: [] as unknown[] }, async () => {
    const normalized = normalizeHashtag(decodeURIComponent(tag || ""));
    if (!normalized) return { posts: [], polls: [] };
    const hashtagRegex = new RegExp(`#${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    const [posts, polls, authorityAuthor] = await Promise.all([
      Post.find({ status: "published", $or: [{ title: hashtagRegex }, { content: hashtagRegex }, { tags: hashtagRegex }] })
        .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
        .sort({ publishedAt: -1 })
        .limit(50)
        .lean(),
      Poll.find({ status: { $in: ["active", "closed"] }, $or: [{ question: hashtagRegex }, { description: hashtagRegex }] })
        .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort({ publishedAt: -1 })
        .limit(50)
        .lean(),
      getAuthorityAuthor()
    ]);
    const withPublisher = <T extends LeanItem>(items: T[]) => attachAuthorityAuthor(normalizePopulatedMediaItems(items), authorityAuthor);
    const filteredPosts = withPublisher(posts as LeanItem[]).filter((post) => textHasHashtag(`${post.title || ""}\n${post.content || ""}\n${((post.tags as string[]) || []).map((item) => `#${item}`).join(" ")}`, normalized));
    const filteredPolls = withPublisher(polls as LeanItem[]).filter((poll) => textHasHashtag(`${poll.question || ""}\n${poll.description || ""}`, normalized));
    return { posts: serialize(filteredPosts), polls: serialize(filteredPolls) };
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
  surveys: number;
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
    { users: 0, activeUsers: 0, citizens: 0, partyAccounts: 0, iecAccounts: 0, adminAccounts: 0, parties: 0, verifiedParties: 0, posts: 0, polls: 0, surveys: 0, comments: 0, postReactions: 0, pollReactions: 0, pollVotes: 0, partyFollowers: 0, chatSessions: 0, chatMessages: 0, auditLogs: 0, openReports: [], recentAuditLogs: [], postsList: [], reports: 0, laws: 0 } as AdminStats,
    async () => {
      const [users, activeUsers, citizens, partyAccounts, iecAccounts, adminAccounts, parties, verifiedParties, posts, polls, surveys, comments, postReactions, pollReactions, pollVotes, partyFollowers, chatSessions, chatMessages, auditLogsCount, openReports, auditLogs, postsList, reports, laws] = await Promise.all([
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
        Survey.countDocuments({ status: { $ne: "deleted" } }),
        Comment.countDocuments({ status: { $ne: "deleted" } }),
        PostReaction.countDocuments(),
        PollReaction.countDocuments(),
        PollVote.countDocuments(),
        PartyFollower.countDocuments(),
        ChatSession.countDocuments(),
        ChatMessage.countDocuments(),
        AuditLog.countDocuments(),
        Report.find({ status: { $in: ["pending", "open"] } }).sort({ createdAt: -1 }).limit(8).lean(),
        AuditLog.find({}).populate({ path: "actorUserId", select: "name email role" }).sort({ createdAt: -1 }).limit(8).lean(),
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
        surveys,
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
        AuditLog.find({}).populate({ path: "actorUserId", select: "name email role" }).sort({ createdAt: -1 }).limit(100).lean(),
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
    const [posts, polls, surveys, comments, authorityAuthor] = await Promise.all([
      Post.find({ partyId: party._id, status: { $ne: "deleted" } })
        .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt status")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Poll.find({ partyId: party._id, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).limit(50).lean(),
      Survey.find({ partyId: party._id, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).limit(50).lean(),
      Comment.countDocuments({ partyId: party._id, status: "published" }),
      getAuthorityAuthor()
    ]);
    return serialize({ party, posts: attachAuthorityAuthor(normalizePopulatedMediaItems(posts as LeanItem[]), authorityAuthor), polls: attachAuthorityAuthor(polls as LeanItem[], authorityAuthor), surveys: attachAuthorityAuthor(surveys as LeanItem[], authorityAuthor), comments });
  });
}

export async function getIecDashboardData() {
  return safeData({ posts: [] as unknown[], polls: [] as unknown[], laws: [] as unknown[], surveys: [] as unknown[] }, async () => {
    const [posts, polls, laws, surveys, authorityAuthor] = await Promise.all([
      Post.find({ authorType: "iec", status: { $ne: "deleted" } })
        .select("authorType authorUserId partyId publisherSnapshot title content mediaIds tags likesCount dislikesCount commentsCount publishedAt createdAt status")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .populate({ path: "mediaIds", select: "url storageKey mimeType type width height status purpose provider" })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Poll.find({ authorType: "iec", status: { $ne: "deleted" } })
        .select("authorType authorUserId partyId publisherSnapshot question description options totalVotes likesCount dislikesCount commentsCount durationDays startsAt endsAt expiresAt status publishedAt createdAt")
        .populate({ path: "authorUserId", select: "name avatarUrl image role" })
        .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Law.find({}).sort({ updatedAt: -1 }).limit(50).lean(),
      Survey.find({ authorType: "iec", status: { $ne: "deleted" } }).sort({ createdAt: -1 }).limit(50).lean(),
      getAuthorityAuthor()
    ]);
    return {
      posts: serialize(attachAuthorityAuthor(normalizePopulatedMediaItems(posts as LeanItem[]), authorityAuthor)),
      polls: serialize(attachAuthorityAuthor(polls as LeanItem[], authorityAuthor)),
      laws: serialize(laws),
      surveys: serialize(attachAuthorityAuthor(surveys as LeanItem[], authorityAuthor))
    };
  });
}

export async function getIecProfileData() {
  return safeData(null as unknown, async () => {
    const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission" }).populate({ path: "logoMediaId", select: "url status" }).lean();
    return authority ? serialize(authority) : null;
  });
}
