import { z } from "zod";
import { handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import NewsItem from "@/models/NewsItem";

const schema = z.object({ hidden: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, schema);
    await connectToDatabase();
    const item = await NewsItem.findByIdAndUpdate(id, { $set: { status: input.hidden ? "hidden" : "published", isActive: !input.hidden } }, { new: true });
    if (!item) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: input.hidden ? "news.hidden" : "news.unhidden", targetType: "news_item", targetId: item._id, request });
    return ok({ item: serialize(item) });
  } catch (error) {
    return handleApiError(error, request);
  }
}
