import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";

async function main() {
  const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replicaSet.getUri("nashmi_reaction_test");
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const [{ connectToDatabase, mongoose }, { default: Post }, { default: PostReaction }, reactions] = await Promise.all([
    import("../src/lib/db"),
    import("../src/models/Post"),
    import("../src/models/PostReaction"),
    import("../src/lib/reactions")
  ]);

  try {
    await connectToDatabase();
    await PostReaction.syncIndexes();
    const postId = new mongoose.Types.ObjectId();
    const authorId = new mongoose.Types.ObjectId();
    await Post.collection.insertOne({
      _id: postId,
      authorType: "admin",
      authorUserId: authorId,
      content: "Concurrency test",
      status: "published",
      likesCount: 0,
      dislikesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as never);
    const users = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId().toHexString());

    await Promise.all(users.map((userId) => reactions.setReaction("post", postId.toHexString(), userId, "like")));
    let post = await Post.findById(postId).lean();
    assert.equal(post?.likesCount, users.length);
    assert.equal(post?.dislikesCount, 0);
    assert.equal(await PostReaction.countDocuments({ postId }), users.length);

    await Promise.all(users.map((userId) => reactions.setReaction("post", postId.toHexString(), userId, "dislike")));
    post = await Post.findById(postId).lean();
    assert.equal(post?.likesCount, 0);
    assert.equal(post?.dislikesCount, users.length);

    const contestedUser = users[0];
    await Promise.all(Array.from({ length: 16 }, (_, index) => reactions.setReaction("post", postId.toHexString(), contestedUser, index % 2 ? "like" : "dislike")));
    const [likeRecords, dislikeRecords] = await Promise.all([
      PostReaction.countDocuments({ postId, type: "like" }),
      PostReaction.countDocuments({ postId, type: "dislike" })
    ]);
    post = await Post.findById(postId).lean();
    assert.equal(post?.likesCount, likeRecords);
    assert.equal(post?.dislikesCount, dislikeRecords);
    assert.equal((post?.likesCount || 0) + (post?.dislikesCount || 0), users.length);

    await Promise.all(users.map((userId) => reactions.clearReaction("post", postId.toHexString(), userId)));
    post = await Post.findById(postId).lean();
    assert.equal(post?.likesCount, 0);
    assert.equal(post?.dislikesCount, 0);
    assert.equal(await PostReaction.countDocuments({ postId }), 0);
    console.log("Reaction concurrency tests passed.");
  } finally {
    await mongoose.disconnect();
    await replicaSet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
