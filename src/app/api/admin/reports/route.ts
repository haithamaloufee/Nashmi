import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { parseLimit, cursorFilter, getNextCursor } from "@/lib/pagination";
import { serialize } from "@/lib/routeUtils";
import Report from "@/models/Report";

export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const status = url.searchParams.get("status");
    const targetType = url.searchParams.get("targetType");
    const reason = url.searchParams.get("reason");
    const query: Record<string, unknown> = { ...cursorFilter(url.searchParams.get("cursor")) };
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;
    if (reason) query.reason = reason;
    const reports = await Report.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return ok({ reports: serialize(reports) }, { nextCursor: getNextCursor(reports, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
