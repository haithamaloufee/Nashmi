import "server-only";
import { randomUUID } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { getRateLimitSecret } from "@/lib/env";
import { consumeRateLimit, requireRateLimit } from "@/lib/rateLimit";
import { cleanContent } from "@/lib/routeUtils";
import { publicComment } from "@/lib/comments";
import { classifyCommentWithGemini } from "@/lib/moderation/geminiModeration";
import { decideModeration, duplicateKey, obviousFlood, REJECTION_MESSAGE, type ModerationDecision } from "@/lib/moderation/commentModeration";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import Poll from "@/models/Poll";
import mongoose from "mongoose";

export class CommentRejectedError extends Error {
  constructor(public readonly reasonCode: string) {
    super(REJECTION_MESSAGE);
    this.name = "CommentRejectedError";
  }
}

export type CommentTarget = "post" | "poll";
export type CommentClassifier = (content: string) => Promise<ModerationDecision>;

type Input = { targetType: CommentTarget; targetId: string; userId: string; userRole: "citizen"; content: string; clientRequestId?: string };

function metric(event: string, startedAt: number, category = "NONE") {
  console.info({ event: `moderation.${event}`, category, durationMs: Date.now() - startedAt });
}

async function populatedComment(id: unknown) {
  const comment = await Comment.findById(id).populate({ path: "authorUserId", select: "name avatarUrl image role" }).lean();
  if (!comment) throw new Error("NOT_FOUND");
  return publicComment(comment as Record<string, unknown>);
}

export async function createModeratedComment(input: Input, classify: CommentClassifier = classifyCommentWithGemini) {
  const startedAt = Date.now();
  const content = cleanContent(input.content);
  if (!content) throw new CommentRejectedError("EMPTY_CONTENT");
  await connectToDatabase();

  // Retry of a completed request returns the same public comment and cannot increment twice.
  if (input.clientRequestId) {
    const existing = await Comment.findOne({ authorUserId: input.userId, clientRequestId: input.clientRequestId }).select("_id").lean();
    if (existing) return { comment: await populatedComment(existing._id), created: false };
  }

  await requireRateLimit(`comment:${input.userId}`, 10, 10 * 60_000);
  await requireRateLimit(`comment-burst:${input.userId}`, 4, 60_000);
  const Target = input.targetType === "post" ? Post : Poll;
  const activeStatus = input.targetType === "post" ? "published" : "active";
  if (!await Target.exists({ _id: input.targetId, status: activeStatus })) throw new Error("NOT_FOUND");

  if (obviousFlood(content)) {
    metric("spam_rejected", startedAt);
    throw new CommentRejectedError("OBVIOUS_FLOOD");
  }
  const duplicate = await consumeRateLimit(duplicateKey(input.userId, content, getRateLimitSecret()), 1, 2 * 60_000);
  if (!duplicate.ok) {
    metric("spam_rejected", startedAt);
    throw new CommentRejectedError("DUPLICATE_BURST");
  }

  try {
    const result = decideModeration(await classify(content));
    if (!result.allowed) {
      metric("rejected", startedAt, result.category);
      throw new CommentRejectedError(result.reasonCode);
    }
    if (result.reasonCode === "INVALID_AI_OUTPUT") metric("ai_failure", startedAt);
  } catch (error) {
    if (error instanceof CommentRejectedError) throw error;
    // Provider failures and invalid JSON fail open; never log the content, prompt, or provider error.
    metric("ai_failure", startedAt);
  }

  const clientRequestId = input.clientRequestId || randomUUID();
  const session = await mongoose.startSession();
  let createdId: unknown;
  try {
    await session.withTransaction(async () => {
      const [created] = await Comment.create([{
        targetType: input.targetType,
        targetId: input.targetId,
        authorUserId: input.userId,
        authorRoleSnapshot: input.userRole,
        partyId: null,
        content,
        clientRequestId
      }], { session });
      createdId = created._id;
      const updated = input.targetType === "post"
        ? await Post.updateOne({ _id: input.targetId, status: "published" }, { $inc: { commentsCount: 1 } }, { session })
        : await Poll.updateOne({ _id: input.targetId, status: "active" }, { $inc: { commentsCount: 1 } }, { session });
      if (updated.matchedCount !== 1) throw new Error("NOT_FOUND");
    });
  } catch (error) {
    if (input.clientRequestId && typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      const existing = await Comment.findOne({ authorUserId: input.userId, clientRequestId: input.clientRequestId }).select("_id").lean();
      if (existing) return { comment: await populatedComment(existing._id), created: false };
    }
    throw error;
  } finally {
    await session.endSession();
  }
  metric("allowed", startedAt);
  return { comment: await populatedComment(createdId), created: true };
}
