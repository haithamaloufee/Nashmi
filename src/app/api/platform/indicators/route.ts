import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { defaultPollDurationDays } from "@/lib/polls";
import User from "@/models/User";
import Party from "@/models/Party";
import Poll from "@/models/Poll";
import Post from "@/models/Post";
import Survey from "@/models/Survey";
import SurveyResponse from "@/models/SurveyResponse";
import Law from "@/models/Law";
import Comment from "@/models/Comment";
import PollVote from "@/models/PollVote";

const dayMs = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    await connectToDatabase();
    const now = new Date();
    const fallbackStart = new Date(now.getTime() - defaultPollDurationDays * dayMs);

    const openPollQuery = {
      status: "active",
      $or: [
        { endsAt: { $gt: now } },
        { endsAt: null, expiresAt: { $gt: now } },
        { endsAt: { $exists: false }, expiresAt: { $exists: false }, createdAt: { $gt: fallbackStart } },
        { endsAt: null, expiresAt: null, createdAt: { $gt: fallbackStart } }
      ]
    };

    const closedPollQuery = {
      $or: [
        { status: "closed" },
        { status: "active", endsAt: { $lte: now } },
        { status: "active", endsAt: null, expiresAt: { $lte: now } },
        { status: "active", endsAt: { $exists: false }, expiresAt: { $exists: false }, createdAt: { $lte: fallbackStart } },
        { status: "active", endsAt: null, expiresAt: null, createdAt: { $lte: fallbackStart } }
      ]
    };

    const [
      citizensCount,
      usersCount,
      partiesCount,
      openPollsCount,
      closedPollsCount,
      postsCount,
      pollsCount,
      surveysCount,
      surveyResponsesCount,
      lawsCount,
      commentsCount,
      pollVotesCount
    ] = await Promise.all([
      User.countDocuments({ role: "citizen", status: "active" }),
      User.countDocuments({ status: "active" }),
      Party.countDocuments({ status: "active" }),
      Poll.countDocuments(openPollQuery),
      Poll.countDocuments(closedPollQuery),
      Post.countDocuments({ status: "published" }),
      Poll.countDocuments({ status: { $in: ["active", "closed"] } }),
      Survey.countDocuments({ status: { $in: ["published", "closed"] } }),
      SurveyResponse.countDocuments(),
      Law.countDocuments({ status: "published" }),
      Comment.countDocuments({ status: "published" }),
      PollVote.countDocuments()
    ]);

    return ok(
      {
        citizensCount,
        usersCount,
        partiesCount,
        openPollsCount,
        closedPollsCount,
        postsCount,
        pollsCount,
        surveysCount,
        surveyResponsesCount,
        lawsCount,
        updatesCount: postsCount + pollsCount + surveysCount,
        participationsCount: commentsCount + pollVotesCount + surveyResponsesCount
      },
      { headers: cacheHeaders(CACHE_HEADERS.publicFeed) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
