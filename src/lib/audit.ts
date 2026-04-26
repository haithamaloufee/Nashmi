import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getClientIp, getUserAgent, hashSensitive } from "@/lib/security";
import AuditLog from "@/models/AuditLog";

type AuditInput = {
  actorUserId?: string | Types.ObjectId | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId?: string | Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export async function writeAuditLog(input: AuditInput) {
  await connectToDatabase();
  await AuditLog.create({
    actorUserId: input.actorUserId || null,
    actorRole: input.actorRole || null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId || null,
    metadata: sanitizeMetadata(input.metadata || {}),
    ipHash: input.request ? hashSensitive(getClientIp(input.request)) : null,
    userAgentHash: input.request ? hashSensitive(getUserAgent(input.request)) : null
  });
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const blocked = new Set(["password", "passwordHash", "token", "jwt", "secret"]);
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blocked.has(key.toLowerCase())));
}
