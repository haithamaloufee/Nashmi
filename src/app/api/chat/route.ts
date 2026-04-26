import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { chatSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { generateNeutralAnswer } from "@/lib/ai";
import { readJson, serialize } from "@/lib/routeUtils";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";
import Law from "@/models/Law";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`chat:${user.id}:${new Date().toISOString().slice(0, 10)}`, 20, 24 * 60 * 60 * 1000);
    const input = await readJson(request, chatSchema);
    await connectToDatabase();

    let session = input.sessionId ? await ChatSession.findOne({ _id: input.sessionId, userId: user.id }) : null;
    if (!session) {
      session = await ChatSession.create({ userId: user.id, title: input.message.slice(0, 80) });
    }

    await ChatMessage.create({ sessionId: session._id, userId: user.id, role: "user", content: input.message, sourceLawIds: [], safetyFlags: [] });
    const answer = await generateNeutralAnswer(input.message, input.lawId);
    const assistantMessage = await ChatMessage.create({
      sessionId: session._id,
      userId: user.id,
      role: "assistant",
      content: answer.content,
      sourceLawIds: answer.sourceLawIds,
      safetyFlags: answer.safetyFlags,
      model: answer.model,
      tokensUsed: null,
      retentionUntil: null
    });
    if (answer.sourceLawIds.length > 0) await Law.updateMany({ _id: { $in: answer.sourceLawIds } }, { $inc: { askedChatbotCount: 1 } });
    session.updatedAt = new Date();
    await session.save();
    return ok({ session: serialize(session), message: serialize(assistantMessage), sourceLawIds: answer.sourceLawIds });
  } catch (error) {
    return handleApiError(error);
  }
}
