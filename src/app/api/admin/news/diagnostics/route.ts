import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/routeUtils";
import NewsCandidate from "@/models/NewsCandidate";
import NewsEvent from "@/models/NewsEvent";
import NewsRefreshState from "@/models/NewsRefreshState";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 160) || "";
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query = q ? { $or: [{ originalUrl: { $regex: escaped, $options: "i" } }, { originalTitle: { $regex: escaped, $options: "i" } }] } : {};
    const [candidates, candidateCounts, eventCounts, state] = await Promise.all([
      NewsCandidate.find(query).select("sourceId originalUrl originalTitle publishedAt firstDiscoveredAt status reason eventIds").sort({ firstDiscoveredAt: -1 }).limit(50).lean(),
      NewsCandidate.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      NewsEvent.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      NewsRefreshState.findById("global").select("pipelineSourceHealth pipelineLastDiscoveryStats pipelineLastEditorialStats pipelineLastPublishedAt").lean()
    ]);
    const eventIds = candidates.flatMap((candidate) => candidate.eventIds || []);
    const events = await NewsEvent.find({ _id: { $in: eventIds } }).select("titleAr actionStage eventKind eventStatus scheduledAt attributedTo publishedAt verification status reason evidence").lean();
    return ok(serialize({ candidates, events, candidateCounts, eventCounts, state }));
  } catch (error) { return handleApiError(error, request); }
}
