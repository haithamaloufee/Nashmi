import { Types } from "mongoose";

export function buildOwnedChatSessionQuery(sessionId: string, userId: string) {
  if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId)) throw new Error("NOT_FOUND");
  return { _id: sessionId, userId, status: { $ne: "deleted" as const } };
}
