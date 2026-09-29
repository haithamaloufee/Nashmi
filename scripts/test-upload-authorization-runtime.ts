import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import MediaAsset from "../src/models/MediaAsset";

async function main() {
  const database = await MongoMemoryServer.create();
  try {
    await mongoose.connect(database.getUri("nashmi_upload_test"));
    await MediaAsset.init();
    const ownerUserId = new Types.ObjectId();
    const asset = (storageKey: string, sourceUrl?: string | null) => ({
      ownerUserId,
      url: "pending",
      storageKey,
      bucket: "test-bucket",
      mimeType: "image/png",
      sizeBytes: 3293,
      purpose: "avatar" as const,
      status: "pending" as const,
      uploadExpiresAt: new Date(Date.now() + 300_000),
      ...(sourceUrl !== undefined ? { sourceUrl } : {})
    });

    // Existing database records may already contain an explicit null.
    await MediaAsset.collection.insertOne(asset("production/avatars/legacy.png", null));
    const first = await MediaAsset.create(asset("preview/avatars/first.png"));
    const second = await MediaAsset.create(asset("preview/avatars/second.png"));
    const explicitNull = await MediaAsset.create(asset("preview/avatars/explicit-null.png", null));
    assert.equal(first.status, "pending");
    assert.equal(second.status, "pending");
    assert.equal(first.toObject().sourceUrl, undefined);
    assert.equal(second.toObject().sourceUrl, undefined);
    assert.equal(explicitNull.toObject().sourceUrl, undefined);
    assert.equal(await MediaAsset.collection.countDocuments({ sourceUrl: { $type: 10 } }), 1);

    await MediaAsset.create(asset("preview/avatars/migrated.png", "https://example.test/original.png"));
    await assert.rejects(
      MediaAsset.create(asset("preview/avatars/duplicate.png", "https://example.test/original.png")),
      /E11000/
    );
    console.log("MediaAsset sparse-index authorization regression passed.");
  } finally {
    await mongoose.disconnect();
    await database.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
