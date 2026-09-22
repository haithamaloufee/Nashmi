import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { createChatSessionForUser, createNewsChatSessionForUser, CHAT_ALLOWED_ROLES } from "@/lib/ai/chatSession";
import { chatSessionSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import ChatSession from "@/models/ChatSession";

export async function GET() {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    await connectToDatabase();
    const sessions = await ChatSession.find({ userId: user.id, status: { $ne: "deleted" } }).sort({ updatedAt: -1 }).limit(50).lean();
    return ok({ sessions: serialize(sessions) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    const input = await readJson(request, chatSessionSchema);
    if (input.newsId) {
      const result = await createNewsChatSessionForUser({ user, newsId: input.newsId, request });
      return ok({ session: serialize(result.session), initialMessage: serialize(result.initialMessage) }, { status: 201 });
    }
    const session = await createChatSessionForUser({ user, title: input.title || "محادثة جديدة", request });
    return ok({ session: serialize(session) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
