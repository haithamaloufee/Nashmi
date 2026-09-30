import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { verifyNewsPreviewIsolation } from "@/lib/news/previewIsolation";

export const dynamic = "force-dynamic";

/** Read-only verification before any new-pipeline write on a Preview deployment. */
export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    if (process.env.VERCEL_ENV !== "preview") throw new Error("NEWS_PREVIEW_DEPLOYMENT_REQUIRED");
    const connection = await verifyNewsPreviewIsolation();
    return ok({ isolated: true, ...connection, branch: process.env.VERCEL_GIT_COMMIT_REF || null, commit: process.env.VERCEL_GIT_COMMIT_SHA || null });
  } catch (error) { return handleApiError(error, request); }
}
