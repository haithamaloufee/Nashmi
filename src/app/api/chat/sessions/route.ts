import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { chatSessionSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import ChatSession from "@/models/ChatSession";

export async function GET() {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    await connectToDatabase();
    const sessions = await ChatSession.find({ userId: user.id }).sort({ updatedAt: -1 }).limit(50).lean();
    return ok({ sessions: serialize(sessions) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    const input = await readJson(request, chatSessionSchema);
    await connectToDatabase();
    const session = await ChatSession.create({ userId: user.id, title: input.title || null });
    return ok({ session: serialize(session) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
