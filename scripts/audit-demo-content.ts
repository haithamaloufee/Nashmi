import { loadEnv } from "./env";
import { connectToDatabase, mongoose } from "../src/lib/db";
import Comment from "../src/models/Comment";
import Party from "../src/models/Party";
import Poll from "../src/models/Poll";
import Post from "../src/models/Post";
import PostReaction from "../src/models/PostReaction";
import PollReaction from "../src/models/PollReaction";
import PollVote from "../src/models/PollVote";
import Report from "../src/models/Report";

loadEnv();

const englishRegex = /[A-Za-z]/;
const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const placeholderPartySlugs = ["civil-renaissance", "green-development", "national-future", "youth-reform", "social-justice"];

function labelContent(text: string | null | undefined) {
  const value = String(text || "").trim();
  if (!value) return "empty";
  const hasArabic = arabicRegex.test(value);
  const hasEnglish = englishRegex.test(value);
  if (hasArabic && !hasEnglish) return "arabic";
  if (hasEnglish && !hasArabic) return "english";
  if (hasArabic && hasEnglish) return "mixed";
  return "other";
}

function auditDocuments<T extends { _id: unknown; title?: string | null; content?: string | null; question?: string | null; description?: string | null }>(documents: T[]) {
  const totals = { arabic: 0, english: 0, mixed: 0, other: 0, empty: 0 };
  for (const item of documents) {
    const text = item.title || item.content || item.question || item.description || "";
    const label = labelContent(text);
    totals[label as keyof typeof totals] += 1;
  }
  return totals;
}

function formatList(list: string[]) {
  return list.length > 0 ? `\n  - ${list.join("\n  - ")}` : "none";
}

async function main() {
  await connectToDatabase();

  const [posts, polls, comments, parties] = await Promise.all([
    Post.find({}).lean(),
    Poll.find({}).lean(),
    Comment.find({}).lean(),
    Party.find({}).lean()
  ]);

  const placeholderPartySlugsSet = new Set(placeholderPartySlugs);
  const placeholderParties = parties.filter((party) => placeholderPartySlugsSet.has(party.slug));
  const placeholderIds = new Set(placeholderParties.map((party) => String(party._id)));
  const archivedPlaceholderParties = parties.filter((party) => party.status === "archived");

  const postTotals = auditDocuments(posts);
  const pollTotals = auditDocuments(polls);
  const commentTotals = auditDocuments(comments);

  const englishPosts = posts.filter((post) => englishRegex.test(String(post.title || "")) || englishRegex.test(String(post.content || "")));
  const englishPolls = polls.filter((poll) => englishRegex.test(String(poll.question || "")) || englishRegex.test(String(poll.description || "")));
  const englishComments = comments.filter((comment) => englishRegex.test(String(comment.content || "")));

  const placeholderPostCount = posts.filter((post) => post.partyId && placeholderIds.has(String(post.partyId))).length;
  const placeholderPollCount = polls.filter((poll) => poll.partyId && placeholderIds.has(String(poll.partyId))).length;

  const [postReactionCount, pollReactionCount, pollVoteCount, reportCount] = await Promise.all([
    PostReaction.countDocuments({ postId: { $in: posts.map((post) => post._id) } }),
    PollReaction.countDocuments({ pollId: { $in: polls.map((poll) => poll._id) } }),
    PollVote.countDocuments({ pollId: { $in: polls.map((poll) => poll._id) } }),
    Report.countDocuments({})
  ]);

  console.log("=== Nashmi Demo Content Audit ===\n");
  console.log(`Total posts: ${posts.length}`);
  console.log(`  Arabic: ${postTotals.arabic}`);
  console.log(`  English: ${postTotals.english}`);
  console.log(`  Mixed: ${postTotals.mixed}`);
  console.log(`Total polls: ${polls.length}`);
  console.log(`  Arabic: ${pollTotals.arabic}`);
  console.log(`  English: ${pollTotals.english}`);
  console.log(`  Mixed: ${pollTotals.mixed}`);
  console.log(`Total comments: ${comments.length}`);
  console.log(`  Arabic: ${commentTotals.arabic}`);
  console.log(`  English: ${commentTotals.english}`);
  console.log(`  Mixed: ${commentTotals.mixed}`);
  console.log(`\nPlaceholder parties: ${placeholderParties.length}, archived placeholder parties: ${archivedPlaceholderParties.length}`);
  console.log(`Placeholder party posts: ${placeholderPostCount}`);
  console.log(`Placeholder party polls: ${placeholderPollCount}`);
  console.log(`\nEnglish candidate posts: ${englishPosts.length}`);
  console.log(`English candidate polls: ${englishPolls.length}`);
  console.log(`English candidate comments: ${englishComments.length}`);
  console.log(`\nReactions: ${postReactionCount} post reactions, ${pollReactionCount} poll reactions, ${pollVoteCount} poll votes`);
  console.log(`Reports: ${reportCount}`);

  console.log("\nSample English posts:" + formatList(englishPosts.slice(0, 5).map((post) => String(post.title || post.content).slice(0, 80))));
  console.log("\nSample English polls:" + formatList(englishPolls.slice(0, 5).map((poll) => String(poll.question || poll.description).slice(0, 80))));
  console.log("\nSample English comments:" + formatList(englishComments.slice(0, 5).map((comment) => String(comment.content).slice(0, 80))));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
