import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { defaultPollDurationDays } from "@/lib/polls";
import User from "@/models/User";
import Party from "@/models/Party";
import Poll from "@/models/Poll";

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

    const [citizensCount, partiesCount, openPollsCount, closedPollsCount] = await Promise.all([
      User.countDocuments({ role: "citizen", status: "active" }),
      Party.countDocuments({ status: "active" }),
      Poll.countDocuments(openPollQuery),
      Poll.countDocuments(closedPollQuery)
    ]);

    return ok(
      { citizensCount, partiesCount, openPollsCount, closedPollsCount },
      { headers: cacheHeaders(CACHE_HEADERS.publicFeed) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
