import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import { isDuplicateKeyError } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Party from "@/models/Party";
import PartyFollower from "@/models/PartyFollower";

type Context = { params: Promise<{ party: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`party-follow:${user.id}`, 30, 60 * 60 * 1000);
    const { party: partyId } = await context.params;
    await connectToDatabase();
    const party = await Party.findOne({ _id: partyId, status: "active" });
    if (!party) throw new Error("NOT_FOUND");
    try {
      await PartyFollower.create({ partyId, userId: user.id });
      await Party.updateOne({ _id: partyId }, { $inc: { followersCount: 1 } });
      await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "party.follow", targetType: "party", targetId: partyId, request });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      return ok({ followed: true, alreadyFollowing: true });
    }
    return ok({ followed: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["citizen"]);
    requireRateLimit(`party-follow:${user.id}`, 30, 60 * 60 * 1000);
    const { party: partyId } = await context.params;
    await connectToDatabase();
    const deleted = await PartyFollower.deleteOne({ partyId, userId: user.id });
    if (deleted.deletedCount > 0) {
      await Party.updateOne({ _id: partyId, followersCount: { $gt: 0 } }, { $inc: { followersCount: -1 } });
      await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "party.unfollow", targetType: "party", targetId: partyId, request });
    }
    return ok({ followed: false });
  } catch (error) {
    return handleApiError(error);
  }
}
