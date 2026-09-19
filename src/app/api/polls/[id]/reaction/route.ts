import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { reactionSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/routeUtils";
import { clearReaction, setReaction } from "@/lib/reactions";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    await requireRateLimit(`poll-reaction:${user.id}`, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    const input = await readJson(request, reactionSchema);
    await connectToDatabase();
    const updatedPoll = await setReaction("poll", id, user.id, input.type);
    return ok({ reacted: true, type: input.type, ...updatedPoll });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    await requireRateLimit(`poll-reaction:${user.id}`, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    await connectToDatabase();
    const counts = await clearReaction("poll", id, user.id);
    return ok({ reacted: false, ...counts });
  } catch (error) {
    return handleApiError(error);
  }
}
