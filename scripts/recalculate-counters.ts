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

  const countMap = <T extends { _id: unknown; count: number }>(rows: T[]) => new Map(rows.map((row) => [String(row._id), row.count]));
  const reactionMap = <T extends { _id: { targetId: unknown; type: string }; count: number }>(rows: T[], type: string) =>
    new Map(rows.filter((row) => row._id.type === type).map((row) => [String(row._id.targetId), row.count]));

  const [parties, partyFollowers, partyPosts, partyPolls] = await Promise.all([
    Party.find({}).select("_id").lean(),
    PartyFollower.aggregate([{ $group: { _id: "$partyId", count: { $sum: 1 } } }]),
    Post.aggregate([{ $match: { status: "published", partyId: { $ne: null } } }, { $group: { _id: "$partyId", count: { $sum: 1 } } }]),
    Poll.aggregate([{ $match: { status: "active", partyId: { $ne: null } } }, { $group: { _id: "$partyId", count: { $sum: 1 } } }])
  ]);
  const followersByParty = countMap(partyFollowers);
  const postsByParty = countMap(partyPosts);
  const pollsByParty = countMap(partyPolls);
  if (parties.length > 0) {
    await Party.bulkWrite(
      parties.map((party) => ({
        updateOne: {
          filter: { _id: party._id },
          update: {
            $set: {
              followersCount: followersByParty.get(String(party._id)) || 0,
              postsCount: postsByParty.get(String(party._id)) || 0,
              pollsCount: pollsByParty.get(String(party._id)) || 0
            }
          }
        }
      }))
    );
  }

  const [posts, postComments, postReactions] = await Promise.all([
    Post.find({}).select("_id").lean(),
    Comment.aggregate([{ $match: { targetType: "post", status: "published" } }, { $group: { _id: "$targetId", count: { $sum: 1 } } }]),
    PostReaction.aggregate([{ $group: { _id: { targetId: "$postId", type: "$type" }, count: { $sum: 1 } } }])
  ]);
  const commentsByPost = countMap(postComments);
  const likesByPost = reactionMap(postReactions, "like");
  const dislikesByPost = reactionMap(postReactions, "dislike");
  if (posts.length > 0) {
    await Post.bulkWrite(
      posts.map((post) => ({
        updateOne: {
          filter: { _id: post._id },
          update: {
            $set: {
              commentsCount: commentsByPost.get(String(post._id)) || 0,
              likesCount: likesByPost.get(String(post._id)) || 0,
              dislikesCount: dislikesByPost.get(String(post._id)) || 0
            }
          }
        }
      }))
    );
  }

  const [polls, pollComments, pollReactions, pollVotes] = await Promise.all([
    Poll.find({}),
    Comment.aggregate([{ $match: { targetType: "poll", status: "published" } }, { $group: { _id: "$targetId", count: { $sum: 1 } } }]),
    PollReaction.aggregate([{ $group: { _id: { targetId: "$pollId", type: "$type" }, count: { $sum: 1 } } }]),
    PollVote.aggregate([{ $group: { _id: { pollId: "$pollId", optionId: "$optionId" }, count: { $sum: 1 } } }])
  ]);
  const commentsByPoll = countMap(pollComments);
  const likesByPoll = reactionMap(pollReactions, "like");
  const dislikesByPoll = reactionMap(pollReactions, "dislike");
  const votesByOption = new Map(pollVotes.map((vote) => [`${String(vote._id.pollId)}:${String(vote._id.optionId)}`, vote.count]));
  await Promise.all(
    polls.map(async (poll) => {
      poll.options.forEach((option) => {
        option.votesCount = votesByOption.get(`${String(poll._id)}:${String(option._id)}`) || 0;
      });
      poll.totalVotes = poll.options.reduce((sum, option) => sum + option.votesCount, 0);
      poll.commentsCount = commentsByPoll.get(String(poll._id)) || 0;
      poll.likesCount = likesByPoll.get(String(poll._id)) || 0;
      poll.dislikesCount = dislikesByPoll.get(String(poll._id)) || 0;
      await poll.save();
    })
  );
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
