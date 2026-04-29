import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { CHAT_ALLOWED_ROLES, handleChatMessage, logSafeChatError } from "@/lib/ai/chatSession";
import { SharekAiError } from "@/lib/ai/gemini";
import { requireRateLimit, rateLimitWindows } from "@/lib/rateLimit";
import { readJson, serialize } from "@/lib/routeUtils";
import { objectIdSchema } from "@/lib/validators";
import Law from "@/models/Law";

type Context = { params: Promise<{ lawId: string }> };

const schema = z.object({
  message: z.string().trim().max(1200).optional(),
  sessionId: objectIdSchema.optional()
});

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser([...CHAT_ALLOWED_ROLES]);
    requireRateLimit(`chat:message:${user.id}`, 12, rateLimitWindows.hour);
    const { lawId } = await context.params;
    const input = await readJson(request, schema);
    await connectToDatabase();
    const law = await Law.findOne({ _id: lawId, status: "published" }).select("_id title").lean();
    if (!law) throw new Error("NOT_FOUND");

    const result = await handleChatMessage({
      user,
      sessionId: input.sessionId,
      message: input.message || `اشرح "${law.title}" بلغة مبسطة ومحايدة`,
      preferredLawId: lawId,
      request
    });

    return ok({
      session: serialize(result.session),
      userMessage: serialize(result.userMessage),
      message: serialize(result.assistantMessage),
      sources: result.sources,
      sourceLawIds: result.assistantMessage.sourceLawIds
    });
  } catch (error) {
    if (error instanceof SharekAiError) {
      logSafeChatError(error, { route: "/api/chat/law/[lawId]" });
      return fail(error.code === "rate_limit" ? "RATE_LIMITED" : "SERVER_ERROR", error.userMessage, error.code === "rate_limit" ? 429 : 500);
    }
    return handleApiError(error);
  }
}
