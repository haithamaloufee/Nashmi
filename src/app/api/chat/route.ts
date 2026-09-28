import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { getOwnedChatSession, handleChatMessage, handleGuestChatMessage, chatProviderErrorResponse } from "@/lib/ai/chatSession";
import { SharekAiError } from "@/lib/ai/gemini";
import { assistantLimitResponse, consumeAssistantUsage, getAssistantUsage, getAssistantUser, refundAssistantUsage, ASSISTANT_BODY_MAX_BYTES } from "@/lib/assistantUsage";
import { readJsonWithLimit, serialize } from "@/lib/routeUtils";
import { chatSchema } from "@/lib/validators";
import { isLanguage } from "@/lib/i18n";

export async function GET(request: Request) {
  try {
    const user = await getAssistantUser();
    const usage = await getAssistantUsage(request, user);
    return ok({ usage });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const user = await getAssistantUser();
    const input = await readJsonWithLimit(request, chatSchema, ASSISTANT_BODY_MAX_BYTES);
    const headerLanguage = request.headers.get("x-nashmi-language");
    const language = input.language || (isLanguage(headerLanguage) ? headerLanguage : "ar");
    if (user && input.sessionId) await getOwnedChatSession(input.sessionId, user.id);
    const usageResult = await consumeAssistantUsage(request, user);
    if (!usageResult.ok) return assistantLimitResponse(usageResult.usage, language);

    let result;
    try {
      result = user
        ? await handleChatMessage({
          user,
          sessionId: input.sessionId,
          message: input.message,
          preferredLawId: input.lawId,
          newsId: input.newsId,
          request
        })
      : await handleGuestChatMessage({
          message: input.message,
          preferredLawId: input.lawId,
          newsId: input.newsId,
          history: input.history
        });
    } catch (error) {
      await refundAssistantUsage(request, user, usageResult.usage);
      throw error;
    }

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
      return chatProviderErrorResponse(error, request, "/api/chat", startedAt);
    }
    if (error instanceof Error && error.message === "BAD_REQUEST") return fail("BAD_REQUEST", "الرسالة غير صالحة.", 400);
    return handleApiError(error, request);
  }
}
