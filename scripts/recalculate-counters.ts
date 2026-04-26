import { formatSafeError, loadEnv } from "./env";
import { connectToDatabase, mongoose } from "../src/lib/db";
import Party from "../src/models/Party";
import PartyFollower from "../src/models/PartyFollower";
import Post from "../src/models/Post";
import PostReaction from "../src/models/PostReaction";
import Poll from "../src/models/Poll";
import PollVote from "../src/models/PollVote";
import PollReaction from "../src/models/PollReaction";
import Comment from "../src/models/Comment";

loadEnv();

export async function recalculateCounters() {
  await connectToDatabase();

  const parties = await Party.find({});
  for (const party of parties) {
    const [followersCount, postsCount, pollsCount] = await Promise.all([
      PartyFollower.countDocuments({ partyId: party._id }),
      Post.countDocuments({ partyId: party._id, status: "published" }),
      Poll.countDocuments({ partyId: party._id, status: "active" })
    ]);
    await Party.updateOne({ _id: party._id }, { $set: { followersCount, postsCount, pollsCount } });
  }

  const posts = await Post.find({});
  for (const post of posts) {
    const [commentsCount, likesCount, dislikesCount] = await Promise.all([
      Comment.countDocuments({ targetType: "post", targetId: post._id, status: "published" }),
      PostReaction.countDocuments({ postId: post._id, type: "like" }),
      PostReaction.countDocuments({ postId: post._id, type: "dislike" })
    ]);
    await Post.updateOne({ _id: post._id }, { $set: { commentsCount, likesCount, dislikesCount } });
  }

  const polls = await Poll.find({});
  for (const poll of polls) {
    const [commentsCount, likesCount, dislikesCount, votes] = await Promise.all([
      Comment.countDocuments({ targetType: "poll", targetId: poll._id, status: "published" }),
      PollReaction.countDocuments({ pollId: poll._id, type: "like" }),
      PollReaction.countDocuments({ pollId: poll._id, type: "dislike" }),
      PollVote.aggregate([{ $match: { pollId: poll._id } }, { $group: { _id: "$optionId", count: { $sum: 1 } } }])
    ]);
    const voteMap = new Map(votes.map((vote) => [String(vote._id), vote.count]));
    poll.options.forEach((option) => {
      option.votesCount = voteMap.get(String(option._id)) || 0;
    });
    poll.totalVotes = poll.options.reduce((sum, option) => sum + option.votesCount, 0);
    poll.commentsCount = commentsCount;
    poll.likesCount = likesCount;
    poll.dislikesCount = dislikesCount;
    await poll.save();
  }
}

if (process.argv[1]?.endsWith("recalculate-counters.ts")) {
  recalculateCounters()
    .then(async () => {
      console.log("Counters recalculated");
      await mongoose.disconnect();
    })
    .catch(async (error) => {
      console.error(formatSafeError(error));
      await mongoose.disconnect();
      process.exit(1);
    });
}
