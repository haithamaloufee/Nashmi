import { formatSafeError, loadEnv } from "./env";

loadEnv();

async function main() {
  const [{ connectToDatabase, mongoose }, { default: NewsItem }, { default: NewsRefreshReplay }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/models/NewsItem"),
    import("../src/models/NewsRefreshReplay")
  ]);
  try {
    await connectToDatabase();
    await Promise.all([
      NewsItem.collection.createIndex({ canonicalHash: 1 }, { name: "canonicalHash_1", unique: true }),
      NewsItem.collection.createIndex({ expiresAt: 1 }, { name: "expiresAt_1", expireAfterSeconds: 0 }),
      NewsItem.collection.createIndex({ status: 1, isActive: 1, publishedAt: -1 }, { name: "status_1_isActive_1_publishedAt_-1" }),
      NewsItem.collection.createIndex({ sourceUrlHashes: 1 }, { name: "sourceUrlHashes_1" }),
      NewsRefreshReplay.collection.createIndex({ signatureHash: 1 }, { name: "signatureHash_1", unique: true }),
      NewsRefreshReplay.collection.createIndex({ expiresAt: 1 }, { name: "expiresAt_1", expireAfterSeconds: 0 })
    ]);
    console.log("Live-news indexes are present.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(formatSafeError(error));
  process.exit(1);
});
