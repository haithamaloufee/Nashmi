import { z } from "zod";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { CHAT_ALLOWED_ROLES, getOwnedChatSession } from "@/lib/ai/chatSession";
import { readJson, serialize } from "@/lib/routeUtils";
import ChatMessage from "@/models/ChatMessage";

type Context = { params: Promise<{ id: string }> };

const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  status: z.enum(["active", "archived"]).optional()
});

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    const { id } = await context.params;
    await connectToDatabase();
    const session = await getOwnedChatSession(id, user.id);
    const messages = await ChatMessage.find({ sessionId: id, userId: user.id }).sort({ createdAt: 1 }).limit(200).lean();
    return ok({ session: serialize(session), messages: serialize(messages) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    const { id } = await context.params;
    const input = await readJson(request, updateSessionSchema);
    await connectToDatabase();
    const session = await getOwnedChatSession(id, user.id);
    if (input.title) session.title = input.title;
    if (input.status) session.status = input.status;
    await session.save();
    return ok({ session: serialize(session) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    const { id } = await context.params;
    await connectToDatabase();
    const session = await getOwnedChatSession(id, user.id);
    session.status = "deleted";
    await session.save();
    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: "chat.session_deleted",
      targetType: "chat_session",
      targetId: session._id,
      request
    });
    return ok({ session: serialize(session) });
  } catch (error) {
    return handleApiError(error);
  }
}
