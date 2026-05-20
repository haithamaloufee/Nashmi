import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { CHAT_ALLOWED_ROLES, getOwnedChatSession, handleChatMessage, logSafeChatError } from "@/lib/ai/chatSession";
import { SharekAiError } from "@/lib/ai/gemini";
import { assistantLimitResponse, ASSISTANT_BODY_MAX_BYTES, consumeAssistantUsage } from "@/lib/assistantUsage";
import { isLanguage } from "@/lib/i18n";
import { readJsonWithLimit, serialize } from "@/lib/routeUtils";
import { chatMessageSchema } from "@/lib/validators";
import ChatMessage from "@/models/ChatMessage";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    const { id } = await context.params;
    await connectToDatabase();
    await getOwnedChatSession(id, user.id);
    const messages = await ChatMessage.find({ sessionId: id, userId: user.id }).sort({ createdAt: 1 }).limit(200).lean();
    return ok({ messages: serialize(messages) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    const { id } = await context.params;
    const input = await readJsonWithLimit(request, chatMessageSchema, ASSISTANT_BODY_MAX_BYTES);
    const headerLanguage = request.headers.get("x-nashmi-language");
    const language = input.language || (isLanguage(headerLanguage) ? headerLanguage : "ar");
    await getOwnedChatSession(id, user.id);
    const usageResult = await consumeAssistantUsage(request, user);
    if (!usageResult.ok) return assistantLimitResponse(usageResult.usage, language);

    const result = await handleChatMessage({
      user,
      sessionId: id,
      message: input.message,
      preferredLawId: input.lawId,
      request
    });

    return ok({
      session: serialize(result.session),
      userMessage: serialize(result.userMessage),
      message: serialize(result.assistantMessage),
      sources: result.sources,
      sourceLawIds: result.assistantMessage.sourceLawIds,
      usage: usageResult.usage
    });
  } catch (error) {
    if (error instanceof SharekAiError) {
      logSafeChatError(error, { route: "/api/chat/sessions/[id]/messages" });
      return fail(error.code === "rate_limit" ? "RATE_LIMITED" : "SERVER_ERROR", error.userMessage, error.code === "rate_limit" ? 429 : 500);
    }
    if (error instanceof Error && error.message === "BAD_REQUEST") return fail("BAD_REQUEST", "الرسالة غير صالحة.", 400);
    return handleApiError(error);
  }
}
