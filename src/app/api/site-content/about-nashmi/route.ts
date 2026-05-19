import { ok, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { getAboutNashmiContent } from "@/lib/siteContent";

export async function GET() {
  try {
    return ok(
      { content: await getAboutNashmiContent() },
      { headers: cacheHeaders(CACHE_HEADERS.publicFeed) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
