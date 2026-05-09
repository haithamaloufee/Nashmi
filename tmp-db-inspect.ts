import { connectToDatabase } from "./src/lib/db";
import Post from "./src/models/Post";

async function main() {
  await connectToDatabase();
  const posts = await Post.find({ status: "published", authorType: { $in: ["party", "iec"] } })
    .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
    .populate({ path: "mediaIds", select: "url mimeType type width height status" })
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();
  console.log(JSON.stringify(posts.map((p) => ({ _id: String(p._id), authorType: p.authorType, partyId: p.partyId, publisherSnapshot: p.publisherSnapshot, mediaIds: p.mediaIds, content: typeof p.content === 'string' ? p.content.slice(0, 50) : p.content })), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
