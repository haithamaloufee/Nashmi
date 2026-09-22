import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/routeUtils";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const [items, state] = await Promise.all([
      NewsItem.find({}).sort({ publishedAt: -1 }).limit(100).lean(),
      NewsRefreshState.findById("global").lean()
    ]);
    return ok({ items: serialize(items), state: serialize(state) });
  } catch (error) {
    return handleApiError(error);
  }
}
