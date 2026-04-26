import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import { generateNeutralAnswer } from "@/lib/ai";
import { readJson, serialize } from "@/lib/routeUtils";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";
import Law from "@/models/Law";

type Context = { params: Promise<{ lawId: string }> };
const schema = z.object({ message: z.string().trim().max(1200).optional(), sessionId: z.string().optional() });

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`chat:${user.id}:${new Date().toISOString().slice(0, 10)}`, 20, 24 * 60 * 60 * 1000);
    const { lawId } = await context.params;
    const input = await readJson(request, schema);
    const message = input.message || "اشرح هذا القانون بلغة مبسطة";
    await connectToDatabase();
    const law = await Law.findOne({ _id: lawId, status: "published" });
    if (!law) throw new Error("NOT_FOUND");
    let session = input.sessionId ? await ChatSession.findOne({ _id: input.sessionId, userId: user.id }) : null;
    if (!session) session = await ChatSession.create({ userId: user.id, title: `سؤال عن ${law.title}` });
    await ChatMessage.create({ sessionId: session._id, userId: user.id, role: "user", content: message, sourceLawIds: [law._id], safetyFlags: [] });
    const answer = await generateNeutralAnswer(message, lawId);
    const assistantMessage = await ChatMessage.create({
      sessionId: session._id,
      userId: user.id,
      role: "assistant",
      content: answer.content,
      sourceLawIds: answer.sourceLawIds.length ? answer.sourceLawIds : [law._id],
      safetyFlags: answer.safetyFlags,
      model: answer.model
    });
    await Law.updateOne({ _id: law._id }, { $inc: { askedChatbotCount: 1 } });
    session.updatedAt = new Date();
    await session.save();
    return ok({ session: serialize(session), message: serialize(assistantMessage) });
  } catch (error) {
    return handleApiError(error);
  }
}
