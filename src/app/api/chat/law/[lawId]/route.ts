import { z } from "zod";
import { handleApiError, ok } from "@/lib/apiResponse";
import { assistantLimitResponse, ASSISTANT_BODY_MAX_BYTES, consumeAssistantUsage, getAssistantUser, refundAssistantUsage } from "@/lib/assistantUsage";
import { connectToDatabase } from "@/lib/db";
import { handleChatMessage, handleGuestChatMessage, chatProviderErrorResponse } from "@/lib/ai/chatSession";
import { SharekAiError } from "@/lib/ai/gemini";
import { isLanguage } from "@/lib/i18n";
import { readJsonWithLimit, serialize } from "@/lib/routeUtils";
import { objectIdSchema } from "@/lib/validators";
import Law from "@/models/Law";

type Context = { params: Promise<{ lawId: string }> };

const schema = z.object({
  message: z.string().trim().max(1500).optional(),
  sessionId: objectIdSchema.optional(),
  language: z.enum(["ar", "en"]).optional(),
  // Allow long stored assistant messages here too; server will sanitize/truncate
  // history items before forwarding to the AI provider.
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(10000) })).max(8).optional()
});

export async function POST(request: Request, context: Context) {
  const startedAt = Date.now();
  try {
    const user = await getAssistantUser();
    const { lawId } = await context.params;
    const input = await readJsonWithLimit(request, schema, ASSISTANT_BODY_MAX_BYTES);
    await connectToDatabase();
    const law = await Law.findOne({ _id: lawId, status: "published" }).select("_id title").lean();
    if (!law) throw new Error("NOT_FOUND");

    const headerLanguage = request.headers.get("x-nashmi-language");
    const language = input.language || (isLanguage(headerLanguage) ? headerLanguage : "ar");
    const usageResult = await consumeAssistantUsage(request, user);
    if (!usageResult.ok) return assistantLimitResponse(usageResult.usage, language);

    const message = input.message || `اشرح "${law.title}" بلغة مبسطة ومحايدة`;
    let result;
    try {
      result = user
        ? await handleChatMessage({
          user,
          sessionId: input.sessionId,
          message,
          preferredLawId: lawId,
          request
        })
      : await handleGuestChatMessage({
          message,
          preferredLawId: lawId,
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
      return chatProviderErrorResponse(error, request, "/api/chat/law/[lawId]", startedAt);
    }
    return handleApiError(error, request);
  }
}
