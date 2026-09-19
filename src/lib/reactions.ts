export type ReactionType = "like" | "dislike";

export function reactionCounterDelta(previous: ReactionType | null, next: ReactionType | null) {
  return {
    likesCount: (next === "like" ? 1 : 0) - (previous === "like" ? 1 : 0),
    dislikesCount: (next === "dislike" ? 1 : 0) - (previous === "dislike" ? 1 : 0)
  };
}

export function counterUpdatePipeline(delta: { likesCount: number; dislikesCount: number }) {
  return [
    {
      $set: {
        likesCount: { $max: [0, { $add: [{ $ifNull: ["$likesCount", 0] }, delta.likesCount] }] },
        dislikesCount: { $max: [0, { $add: [{ $ifNull: ["$dislikesCount", 0] }, delta.dislikesCount] }] }
      }
    }
  ];
}

export async function setReaction(kind: "post" | "poll", targetId: string, userId: string, next: ReactionType) {
  const [{ startSession }, { default: Post }, { default: Poll }, { default: PostReaction }, { default: PollReaction }] = await Promise.all([
    import("mongoose"), import("@/models/Post"), import("@/models/Poll"), import("@/models/PostReaction"), import("@/models/PollReaction")
  ]);
  const parentModel: any = kind === "post" ? Post : Poll;
  const reactionModel: any = kind === "post" ? PostReaction : PollReaction;
  const targetKey = kind === "post" ? "postId" : "pollId";
  const status = kind === "post" ? "published" : "active";
  const session = await startSession();
  try {
    const result = await session.withTransaction(async () => {
      const parent = await parentModel.findOne({ _id: targetId, status }).session(session);
      if (!parent) throw new Error("NOT_FOUND");
      const filter = { [targetKey]: targetId, userId };
      const existing = await reactionModel.findOne(filter).session(session);
      const previous = (existing?.type as ReactionType | undefined) || null;
      if (!existing) await reactionModel.create([{ ...filter, type: next }], { session });
      else if (existing.type !== next) await reactionModel.updateOne({ _id: existing._id }, { $set: { type: next } }, { session });
      const delta = reactionCounterDelta(previous, next);
      const updated = delta.likesCount || delta.dislikesCount
        ? await parentModel.findByIdAndUpdate(targetId, counterUpdatePipeline(delta), { new: true, session })
        : parent;
      return { likesCount: Number(updated?.likesCount || 0), dislikesCount: Number(updated?.dislikesCount || 0) };
    });
    if (!result) throw new Error("NOT_FOUND");
    return result;
  } finally {
    await session.endSession();
  }
}

export async function clearReaction(kind: "post" | "poll", targetId: string, userId: string) {
  const [{ startSession }, { default: Post }, { default: Poll }, { default: PostReaction }, { default: PollReaction }] = await Promise.all([
    import("mongoose"), import("@/models/Post"), import("@/models/Poll"), import("@/models/PostReaction"), import("@/models/PollReaction")
  ]);
  const parentModel: any = kind === "post" ? Post : Poll;
  const reactionModel: any = kind === "post" ? PostReaction : PollReaction;
  const targetKey = kind === "post" ? "postId" : "pollId";
  const status = kind === "post" ? "published" : "active";
  const session = await startSession();
  try {
    const result = await session.withTransaction(async () => {
      const parent = await parentModel.findOne({ _id: targetId, status }).session(session);
      if (!parent) throw new Error("NOT_FOUND");
      const existing = await reactionModel.findOneAndDelete({ [targetKey]: targetId, userId }, { session });
      const updated = existing
        ? await parentModel.findByIdAndUpdate(targetId, counterUpdatePipeline(reactionCounterDelta(existing.type as ReactionType, null)), { new: true, session })
        : parent;
      return { likesCount: Number(updated?.likesCount || 0), dislikesCount: Number(updated?.dislikesCount || 0) };
    });
    if (!result) throw new Error("NOT_FOUND");
    return result;
  } finally {
    await session.endSession();
  }
}
