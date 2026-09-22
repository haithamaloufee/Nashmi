import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { refreshNews } from "@/lib/news/service";
import { requireRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["admin", "super_admin"]);
    await requireRateLimit(`admin:news-refresh:${user.id}`, 2, 60 * 60 * 1000);
    const result = await refreshNews({ forceDryRun: true });
    return ok(result);
  } catch (error) {
    return handleApiError(error, request);
  }
}
