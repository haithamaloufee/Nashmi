import { formatSafeError, loadEnv } from "./env";

loadEnv();

async function main() {
  const [{ connectToDatabase, mongoose }, { default: User }, { default: RateLimitBucket }, { default: Comment }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/models/User"),
    import("../src/models/RateLimitBucket"),
    import("../src/models/Comment")
  ]);
  try {
    await connectToDatabase();
    await Promise.all([
      User.collection.createIndex({ passwordSetupTokenHash: 1 }, { name: "passwordSetupTokenHash_1", unique: true, sparse: true }),
      User.collection.createIndex({ passwordSetupExpiresAt: 1 }, { name: "passwordSetupExpiresAt_1", sparse: true }),
      RateLimitBucket.collection.createIndex({ expiresAt: 1 }, { name: "expiresAt_1", expireAfterSeconds: 0 }),
      Comment.collection.createIndex({ authorUserId: 1, clientRequestId: 1 }, { name: "authorUserId_1_clientRequestId_1", unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } })
    ]);
    console.log("Hardening indexes are present.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(formatSafeError(error));
  process.exit(1);
});
