import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { normalizeArabic, searchRegex } from "@/lib/arabicSearch";
import { parseLimit } from "@/lib/pagination";
import { serialize } from "@/lib/routeUtils";
import Party from "@/models/Party";

function seededScore(seed: string, slug: string) {
  const input = `${seed}:${slug}`;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const seed = url.searchParams.get("seed") || "sharek-neutral";
    const limit = parseLimit(url.searchParams.get("limit"));
    const offset = Math.max(Number(url.searchParams.get("cursor") || 0) || 0, 0);
    const regex = search ? searchRegex(search) : null;
    const filter = regex ? { status: "active", searchNormalized: regex } : { status: "active" };

    const parties = await Party.find(filter).lean();
    const ordered = parties
      .sort((a, b) => {
        const score = seededScore(seed, a.slug) - seededScore(seed, b.slug);
        return score === 0 ? a.slug.localeCompare(b.slug, "ar") : score;
      })
      .slice(offset, offset + limit);

    return ok(
      { parties: serialize(ordered), searchNormalized: normalizeArabic(search || "") },
      { nextCursor: offset + limit < parties.length ? String(offset + limit) : null }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
