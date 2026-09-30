import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { assertPipelineWriteIsolation } from "@/lib/news/pipeline";

export const dynamic = "force-dynamic";

/** Read-only verification before any new-pipeline write on a Preview deployment. */
export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    if (process.env.VERCEL_ENV !== "preview") throw new Error("NEWS_PREVIEW_DEPLOYMENT_REQUIRED");
    const connection = await assertPipelineWriteIsolation();
    return ok({ isolated: true, database: connection.connection.db?.databaseName, branch: process.env.VERCEL_GIT_COMMIT_REF || null, commit: process.env.VERCEL_GIT_COMMIT_SHA || null });
  } catch (error) { return handleApiError(error, request); }
}
