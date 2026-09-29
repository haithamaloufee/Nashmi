import assert from "node:assert/strict";
import Module from "node:module";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

async function main() {
  const database = await MongoMemoryServer.create();
  const uri = database.getUri("nashmi_parties_route_test");
  const client = new MongoClient(uri);
  const previousUri = process.env.MONGODB_URI;
  const previousVercelEnv = process.env.VERCEL_ENV;

  try {
    process.env.MONGODB_URI = uri;
    delete process.env.VERCEL_ENV;
    await client.connect();
    const db = client.db("nashmi_parties_route_test");
    const logoId = new ObjectId();
    const partyId = new ObjectId();
    const logoUrl = `/api/media/${logoId}`;

    // Insert through the driver so the fixture does not register MediaAsset for the route.
    await db.collection("mediaassets").insertOne({
      _id: logoId,
      url: logoUrl,
      status: "ready"
    });
    await db.collection("parties").insertOne({
      _id: partyId,
      name: "حزب اختبار",
      slug: "route-populate-test",
      shortDescription: "اختبار شعار الحزب",
      status: "active",
      logoMediaId: logoId,
      logoUrl: null,
      followersCount: 0,
      isVerified: true
    });

    assert.equal(mongoose.models.MediaAsset, undefined);
    // Next replaces this server-side marker during bundling; tsx needs the same no-op.
    const loader = Module as typeof Module & { _load: (...args: unknown[]) => unknown };
    const originalLoad = loader._load;
    loader._load = function (request: unknown, ...args: unknown[]) {
      if (request === "server-only") return {};
      return originalLoad.call(this, request, ...args);
    };
    let GET: typeof import("../src/app/api/parties/route").GET;
    try {
      ({ GET } = await import("../src/app/api/parties/route"));
    } finally {
      loader._load = originalLoad;
    }
    const response = await GET(new Request("http://localhost/api/parties?limit=10"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.parties.length, 1);
    assert.equal(body.data.parties[0].slug, "route-populate-test");
    assert.equal(body.data.parties[0].logoMediaId.url, logoUrl);
    assert.equal(body.data.parties[0].logoMediaId.status, "ready");
    console.log("Party route MediaAsset population regression passed.");
  } finally {
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
    await mongoose.disconnect();
    await client.close();
    await database.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
