import "server-only";

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSharekAssistantConfig, generateSharekAssistantResponse, retrieveRelevantLawContext, SharekAiError } from "@/lib/ai/gemini";
import { writeAuditLog } from "@/lib/audit";
import type { SafeUser } from "@/lib/auth";
import ChatMessage from "@/models/ChatMessage";
import ChatSession from "@/models/ChatSession";
import Law from "@/models/Law";

export const CHAT_ALLOWED_ROLES = ["citizen", "party", "iec", "admin", "super_admin"] as const;

export function makeChatTitle(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 40) : "محادثة جديدة";
}

export function logSafeChatError(error: unknown, metadata: Record<string, unknown> = {}) {
  const message = error instanceof SharekAiError ? error.code : error instanceof Error ? error.message : "unknown";
  console.error({ name: "ChatAssistantError", message, ...metadata });
}

export async function getOwnedChatSession(sessionId: string, userId: string) {
  if (!Types.ObjectId.isValid(sessionId)) throw new Error("NOT_FOUND");
  const session = await ChatSession.findOne({ _id: sessionId, userId, status: { $ne: "deleted" } });
  if (!session) throw new Error("NOT_FOUND");
  return session;
}

export async function createChatSessionForUser(params: { user: SafeUser; title?: string | null; request?: Request }) {
  await connectToDatabase();
  const config = getSharekAssistantConfig();
  const session = await ChatSession.create({
    userId: params.user.id,
    title: params.title || "محادثة جديدة",
    status: "active",
    provider: "gemini",
    model: config.model
  });

  await writeAuditLog({
    actorUserId: params.user.id,
    actorRole: params.user.role,
    action: "chat.session_created",
    targetType: "chat_session",
    targetId: session._id,
    request: params.request
  });

  return session;
}

export async function handleChatMessage(params: {
  user: SafeUser;
  sessionId?: string | null;
  message: string;
  preferredLawId?: string;
  request?: Request;
}) {
  await connectToDatabase();
  const config = getSharekAssistantConfig();
  const cleanMessage = params.message.replace(/\s+/g, " ").trim();
  if (!cleanMessage) throw new Error("BAD_REQUEST");

  let session = params.sessionId ? await getOwnedChatSession(params.sessionId, params.user.id) : null;
  if (!session) {
    session = await createChatSessionForUser({ user: params.user, title: makeChatTitle(cleanMessage), request: params.request });
  }

  if (!session.title || session.title === "محادثة جديدة") {
    session.title = makeChatTitle(cleanMessage);
  }

  const lawContext = await retrieveRelevantLawContext(cleanMessage, params.preferredLawId, config.maxLawContextResults);
  const userMessage = await ChatMessage.create({
    sessionId: session._id,
    userId: params.user.id,
    role: "user",
    content: cleanMessage,
    sourceLawIds: params.preferredLawId && Types.ObjectId.isValid(params.preferredLawId) ? [params.preferredLawId] : [],
    sourcePartyIds: [],
    groundingSources: [],
    safetyFlags: []
  });

  const recentMessages = await ChatMessage.find({ sessionId: session._id, userId: params.user.id })
    .sort({ createdAt: -1 })
    .limit(config.maxHistoryMessages)
    .lean();
  const history = recentMessages
    .reverse()
    .map((item) => ({ role: item.role as "user" | "assistant", content: item.content }))
    .filter((item) => item.content.trim());

  try {
    const answer = await generateSharekAssistantResponse({
      message: cleanMessage,
      history,
      lawContext
    });

    const assistantMessage = await ChatMessage.create({
      sessionId: session._id,
      userId: params.user.id,
      role: "assistant",
      content: answer.content,
      sourceLawIds: answer.sourceLawIds,
      sourcePartyIds: [],
      groundingSources: answer.groundingSources,
      safetyFlags: answer.safetyFlags,
      model: answer.model,
      tokensUsed: answer.tokensUsed,
      retentionUntil: null
    });

    if (answer.sourceLawIds.length > 0) {
      await Law.updateMany({ _id: { $in: answer.sourceLawIds } }, { $inc: { askedChatbotCount: 1 } });
    }

    session.set("model", answer.model);
    session.set("provider", "gemini");
    session.updatedAt = new Date();
    await session.save();

    return { session, userMessage, assistantMessage, sources: answer.groundingSources };
  } catch (error) {
    await writeAuditLog({
      actorUserId: params.user.id,
      actorRole: params.user.role,
      action: "chat.error",
      targetType: "chat_session",
      targetId: session._id,
      metadata: {
        errorCode: error instanceof SharekAiError ? error.code : "unknown",
        model: config.model
      },
      request: params.request
    }).catch((auditError) => logSafeChatError(auditError, { stage: "audit" }));
    throw error;
  }
}
