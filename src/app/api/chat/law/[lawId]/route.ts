import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { assistantLimitResponse, ASSISTANT_BODY_MAX_BYTES, consumeAssistantUsage, getAssistantUser } from "@/lib/assistantUsage";
import { connectToDatabase } from "@/lib/db";
import { handleChatMessage, handleGuestChatMessage, logSafeChatError } from "@/lib/ai/chatSession";
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
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).max(8).optional()
});

export async function POST(request: Request, context: Context) {
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
    const result = user
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
      logSafeChatError(error, { route: "/api/chat/law/[lawId]" });
      return fail(error.code === "rate_limit" ? "RATE_LIMITED" : "SERVER_ERROR", error.userMessage, error.code === "rate_limit" ? 429 : 500);
    }
    return handleApiError(error);
  }
}
