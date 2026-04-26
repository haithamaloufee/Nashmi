import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { parseLimit, cursorFilter, getNextCursor } from "@/lib/pagination";
import { serialize } from "@/lib/routeUtils";
import AuditLog from "@/models/AuditLog";

export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const logs = await AuditLog.find(cursorFilter(url.searchParams.get("cursor"))).sort({ createdAt: -1 }).limit(limit).lean();
    return ok({ logs: serialize(logs) }, { nextCursor: getNextCursor(logs, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
