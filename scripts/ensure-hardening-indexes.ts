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
    // Build the replacement first so token uniqueness remains enforced while
    // removing the legacy unique+sparse index (which also indexes explicit null).
    for (const field of ["passwordSetupTokenHash", "emailVerificationTokenHash", "passwordResetTokenHash"] as const) {
      const legacyName = `${field}_1`;
      const replacementName = `${field}_string_unique`;
      await User.collection.createIndex(
        { [field]: 1 },
        { name: replacementName, unique: true, partialFilterExpression: { [field]: { $type: "string" } } }
      );
      const legacy = (await User.collection.indexes()).find((index) => index.name === legacyName);
      if (legacy) {
        if (!legacy.unique || !legacy.sparse || legacy.key[field] !== 1) {
          throw new Error(`Unexpected legacy index definition: ${legacyName}`);
        }
        await User.collection.dropIndex(legacyName);
      }
    }
    await Promise.all([
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
