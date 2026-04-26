import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import Party from "@/models/Party";
import Post from "@/models/Post";
import Poll from "@/models/Poll";

type Context = { params: Promise<{ party: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { party: partyId } = await context.params;
    await connectToDatabase();
    const party = await Party.findById(partyId).select("followersCount postsCount pollsCount status").lean();
    if (!party || party.status !== "active") throw new Error("NOT_FOUND");
    const [publishedPosts, activePolls] = await Promise.all([
      Post.countDocuments({ partyId, status: "published" }),
      Poll.countDocuments({ partyId, status: "active" })
    ]);
    return ok({
      stats: {
        followersCount: party.followersCount,
        postsCount: publishedPosts,
        pollsCount: activePolls
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
