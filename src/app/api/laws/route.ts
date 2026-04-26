import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { searchRegex } from "@/lib/arabicSearch";
import { cursorFilter, getNextCursor, newestSort, parseLimit } from "@/lib/pagination";
import { lawDisclaimer, serialize } from "@/lib/routeUtils";
import Law from "@/models/Law";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const search = url.searchParams.get("search");
    const category = url.searchParams.get("category");
    const regex = search ? searchRegex(search) : null;
    const query: Record<string, unknown> = { status: "published", ...cursorFilter(url.searchParams.get("cursor")) };
    if (category) query.category = category;
    if (regex) query.searchNormalized = regex;
    const laws = await Law.find(query).sort(newestSort).limit(limit).lean();
    const categories = await Law.distinct("category", { status: "published" });
    return ok({ laws: serialize(laws), categories, disclaimer: lawDisclaimer() }, { nextCursor: getNextCursor(laws, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
