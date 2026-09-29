import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

async function main() {
  const database = await MongoMemoryServer.create();
  const uri = database.getUri("nashmi_publisher_test");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("nashmi_publisher_test");
    const logoId = new ObjectId();
    const logoUrl = `/api/media/${logoId}`;
    await db.collection("mediaassets").insertOne({ _id: logoId, url: logoUrl, status: "ready" });
    await db.collection("authorityprofiles").insertOne({
      name: "هيئة اختبار",
      slug: "independent-election-commission",
      status: "active",
      logoMediaId: logoId
    });

    assert.equal(mongoose.models.MediaAsset, undefined);
    await mongoose.connect(uri);
    const { getAuthorityAuthor } = await import("../src/lib/publisher");
    const authority = await getAuthorityAuthor();
    assert.equal(authority.name, "هيئة اختبار");
    assert.equal(authority.logoUrl, logoUrl);
    console.log("Publisher MediaAsset population regression passed.");
  } finally {
    await mongoose.disconnect();
    await client.close();
    await database.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
