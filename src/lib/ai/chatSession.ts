import "server-only";

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSharekAssistantConfig, generateSharekAssistantResponse, retrieveRelevantLawContext, SharekAiError } from "@/lib/ai/gemini";
import { writeAuditLog } from "@/lib/audit";
import type { SafeUser } from "@/lib/auth";
import ChatMessage from "@/models/ChatMessage";
import ChatSession from "@/models/ChatSession";
import Law from "@/models/Law";
import { logServerError } from "@/lib/observability";
import { getNewsSnapshot } from "@/lib/news/service";
import type { NewsContextSnapshot } from "@/lib/news/types";
import { buildOwnedChatSessionQuery } from "@/lib/ai/chatOwnership";

export const CHAT_ALLOWED_ROLES = ["citizen", "party", "iec", "admin", "super_admin"] as const;

export function makeChatTitle(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 40) : "محادثة جديدة";
}

export function logSafeChatError(error: unknown, metadata: Record<string, unknown> = {}) {
  const route = typeof metadata.route === "string" ? metadata.route : undefined;
  logServerError(error instanceof SharekAiError ? new Error(error.code) : error, { route, category: "ai.provider_error" });
}

export async function getOwnedChatSession(sessionId: string, userId: string) {
  const session = await ChatSession.findOne(buildOwnedChatSessionQuery(sessionId, userId));
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

export function buildNewsInitialSummary(news: NewsContextSnapshot) {
  const sourceNames = news.sources.map((source) => source.publisher).join("، ");
  return [
    `## ${news.titleAr}`,
    "",
    news.summaryAr,
    "",
    `**تاريخ النشر:** ${news.publishedAt.toLocaleString("ar-JO", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Amman" })}`,
    `**المصادر المحفوظة:** ${sourceNames}`,
    "",
    "اسألني عن تفاصيل هذا المستجد أو أثره على المواطن، وسأجيب اعتماداً على السياق والمصادر المحفوظة."
  ].join("\n");
}

export async function createNewsChatSessionForUser(params: { user: SafeUser; newsId: string; request?: Request }) {
  await connectToDatabase();
  const newsContext = await getNewsSnapshot(params.newsId);
  const config = getSharekAssistantConfig();
  const session = await ChatSession.create({
    userId: params.user.id,
    title: newsContext.titleAr.slice(0, 160),
    status: "active",
    provider: "gemini",
    model: config.model,
    newsContext
  });
  const initialMessage = await ChatMessage.create({
    sessionId: session._id,
    userId: params.user.id,
    role: "assistant",
    content: buildNewsInitialSummary(newsContext),
    sourceLawIds: [],
    sourcePartyIds: [],
    groundingSources: newsContext.sources.map((source) => ({ title: source.title, url: source.url, sourceType: "news_source" })),
    safetyFlags: ["deterministic_news_summary"],
    model: "local-news-context",
    tokensUsed: null,
    retentionUntil: null
  });
  await writeAuditLog({ actorUserId: params.user.id, actorRole: params.user.role, action: "chat.news_session_created", targetType: "chat_session", targetId: session._id, metadata: { newsId: params.newsId }, request: params.request });
  return { session, initialMessage };
}

export async function handleChatMessage(params: {
  user: SafeUser;
  sessionId?: string | null;
  message: string;
  preferredLawId?: string;
  newsId?: string;
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

  const newsContext: NewsContextSnapshot | undefined = session.newsContext ? {
    newsId: session.newsContext.newsId,
    titleAr: session.newsContext.titleAr,
    summaryAr: session.newsContext.summaryAr,
    category: session.newsContext.category,
    urgency: session.newsContext.urgency,
    publishedAt: new Date(session.newsContext.publishedAt),
    legislativeStage: session.newsContext.legislativeStage || null,
    sources: session.newsContext.sources.map((source) => ({
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      sourceClass: source.sourceClass
    }))
  } : undefined;
  const lawContext = newsContext ? [] : await retrieveRelevantLawContext(cleanMessage, params.preferredLawId, config.maxLawContextResults);
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
      lawContext,
      newsContext
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

export async function handleGuestChatMessage(params: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  preferredLawId?: string;
  newsId?: string;
}) {
  await connectToDatabase();
  const config = getSharekAssistantConfig();
  const cleanMessage = params.message.replace(/\s+/g, " ").trim();
  if (!cleanMessage) throw new Error("BAD_REQUEST");

  const newsContext = params.newsId ? await getNewsSnapshot(params.newsId) : undefined;
  const lawContext = newsContext ? [] : await retrieveRelevantLawContext(cleanMessage, params.preferredLawId, config.maxLawContextResults);
  const history = (params.history || [])
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.replace(/\s+/g, " ").trim().slice(0, 1200) }))
    .filter((item) => item.content);

  const answer = await generateSharekAssistantResponse({
    message: cleanMessage,
    history,
    lawContext,
    newsContext
  });

  if (answer.sourceLawIds.length > 0) {
    await Law.updateMany({ _id: { $in: answer.sourceLawIds } }, { $inc: { askedChatbotCount: 1 } });
  }

  return {
    session: null,
    userMessage: {
      _id: `guest-user-${Date.now()}`,
      role: "user" as const,
      content: cleanMessage,
      sourceLawIds: params.preferredLawId && Types.ObjectId.isValid(params.preferredLawId) ? [params.preferredLawId] : [],
      sourcePartyIds: [],
      groundingSources: [],
      safetyFlags: [],
      createdAt: new Date()
    },
    assistantMessage: {
      _id: `guest-assistant-${Date.now()}`,
      role: "assistant" as const,
      content: answer.content,
      sourceLawIds: answer.sourceLawIds,
      sourcePartyIds: [],
      groundingSources: answer.groundingSources,
      safetyFlags: answer.safetyFlags,
      model: answer.model,
      tokensUsed: answer.tokensUsed,
      createdAt: new Date()
    },
    sources: answer.groundingSources
  };
}
