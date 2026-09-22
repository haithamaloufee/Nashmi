import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiResponse";
import { connectToDatabase } from "@/lib/db";
import { getR2DownloadExpirySeconds, hasR2Credentials } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { getObjectStorage } from "@/lib/storage/index";
import { validateVercelBlobUrl } from "@/lib/remoteFetch";
import { requireRateLimit } from "@/lib/rateLimit";
import MediaAsset from "@/models/MediaAsset";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const asset = await MediaAsset.findOne({ _id: id, status: { $in: ["ready", "active"] } }).lean().catch(() => null);
    if (!asset) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

    let user = null;
    if (asset.visibility === "protected") {
      user = await getCurrentUser();
      if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
      const isOwner = String(asset.ownerUserId) === user.id;
      const isAdmin = user.role === "admin" || user.role === "super_admin";
      if (!isOwner && !isAdmin) return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const rateLimitKey = user ? `media-read:${user.id}` : `media-public:${id}`;
    await requireRateLimit(rateLimitKey, user ? 240 : 600, 60 * 60 * 1000);
    if (asset.provider === "vercel_blob" || asset.provider === "local_dev") {
      return NextResponse.redirect(new URL(asset.url, "https://nashmi.haitham.website"), 307);
    }
    if (!hasR2Credentials() && asset.visibility !== "protected" && asset.sourceProvider === "vercel_blob" && asset.sourceUrl) {
      const parsedSource = new URL(asset.sourceUrl);
      const expectedStorageKey = decodeURIComponent(parsedSource.pathname.replace(/^\/+/, ""));
      const trustedSource = validateVercelBlobUrl(asset.sourceUrl, expectedStorageKey);
      return NextResponse.redirect(trustedSource, 307);
    }
    const downloadName = asset.visibility === "protected" ? asset.originalFileName || "download" : null;
    const signedUrl = await getObjectStorage().createDownloadUrl(asset.storageKey, getR2DownloadExpirySeconds(), downloadName);
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: {
        "Cache-Control": asset.visibility === "protected" ? "private, no-store" : "public, max-age=30, s-maxage=30",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
