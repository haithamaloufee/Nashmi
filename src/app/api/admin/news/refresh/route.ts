import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { refreshNews } from "@/lib/news/service";
import { runNewsEditorial } from "@/lib/news/pipeline";
import { getNewsPipelineMode } from "@/lib/news/pipelineMode";
import { requireRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["admin", "super_admin"]);
    await requireRateLimit(`admin:news-refresh:${user.id}`, 2, 60 * 60 * 1000);
    if (getNewsPipelineMode() === "legacy") return ok(await refreshNews());
    const stats = await runNewsEditorial();
    return ok({ stats: { ...stats, created: stats.published, dryRun: stats.mode === "shadow" }, preview: [] });
  } catch (error) {
    return handleApiError(error, request);
  }
}
