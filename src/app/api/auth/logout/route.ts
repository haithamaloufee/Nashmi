import { ok, handleApiError } from "@/lib/apiResponse";
import { clearAuthCookie } from "@/lib/cookies";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const response = ok({ loggedOut: true });
    clearAuthCookie(response);
    if (user) await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "auth.logout", targetType: "user", targetId: user.id, request });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
