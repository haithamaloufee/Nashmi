import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "local";
  return NextResponse.json(
    {
      sha,
      shortSha: sha === "local" ? sha : sha.slice(0, 12),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
