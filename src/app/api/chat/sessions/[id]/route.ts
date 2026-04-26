import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { serialize } from "@/lib/routeUtils";
import ChatSession from "@/models/ChatSession";
import ChatMessage from "@/models/ChatMessage";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    const { id } = await context.params;
    await connectToDatabase();
    const session = await ChatSession.findOne({ _id: id, userId: user.id }).lean();
    if (!session) throw new Error("NOT_FOUND");
    const messages = await ChatMessage.find({ sessionId: id, userId: user.id }).sort({ createdAt: 1 }).limit(200).lean();
    return ok({ session: serialize(session), messages: serialize(messages) });
  } catch (error) {
    return handleApiError(error);
  }
}
