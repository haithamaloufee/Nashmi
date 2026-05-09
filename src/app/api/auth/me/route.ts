import { ok, handleApiError } from "@/lib/apiResponse";
import { getCurrentUser } from "@/lib/auth";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";

export async function GET() {
  try {
    return ok({ user: await getCurrentUser() }, { headers: cacheHeaders(CACHE_HEADERS.privateNoStore) });
  } catch (error) {
    return handleApiError(error);
  }
}
