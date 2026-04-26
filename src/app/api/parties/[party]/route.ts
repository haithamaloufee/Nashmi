import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { serialize } from "@/lib/routeUtils";
import Party from "@/models/Party";
import Post from "@/models/Post";
import Poll from "@/models/Poll";

type Context = { params: Promise<{ party: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { party: key } = await context.params;
    await connectToDatabase();
    const query = isValidObjectId(key) ? { _id: key, status: "active" } : { slug: key, status: "active" };
    const party = await Party.findOne(query).lean();
    if (!party) throw new Error("NOT_FOUND");
    const [posts, polls] = await Promise.all([
      Post.find({ partyId: party._id, status: "published" }).sort({ publishedAt: -1 }).limit(6).lean(),
      Poll.find({ partyId: party._id, status: "active" }).sort({ publishedAt: -1 }).limit(6).lean()
    ]);
    return ok({ party: serialize(party), posts: serialize(posts), polls: serialize(polls) });
  } catch (error) {
    return handleApiError(error);
  }
}
