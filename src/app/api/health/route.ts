import { ok } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "unknown";
  return ok(
    {
      status: "ok",
      service: "nashmi",
      sha: sha === "unknown" ? sha : sha.slice(0, 12),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown"
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
