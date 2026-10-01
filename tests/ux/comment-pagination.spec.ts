import { test, expect } from "@playwright/test";
import { fixtures } from "./helpers";
import mongoose from "mongoose";
import { readFileSync } from "node:fs";

test("known unresolved server issue: tied comment timestamps must not skip rows", async ({ request }) => {
  test.fail(true, "Separate server approval pending: docs/BACKEND-COMMENT-PAGINATION-PROPOSAL.md");
  const runtime = JSON.parse(readFileSync("test-results/qa-runtime.json", "utf8"));
  if (!runtime.MONGODB_URI.startsWith("mongodb://127.0.0.1:") || !runtime.MONGODB_URI.includes("nashmi_ux_qa")) throw Error("Local QA only");
  const db = await mongoose.createConnection(runtime.MONGODB_URI).asPromise();
  const post = await db.collection("posts").insertOne({ authorType: "admin", content: "Isolated equal-time comment fixture", status: "published", publishedAt: new Date("2020-01-01T12:00:00.731Z") });
  const inserted = await db.collection("comments").insertMany(Array.from({ length: 8 }, (_, i) => ({ targetType: "post", targetId: post.insertedId, authorUserId: new mongoose.Types.ObjectId(fixtures().citizenId), authorRoleSnapshot: "citizen", content: `Comment cursor fixture ${i}`, status: "published", createdAt: new Date("2020-01-01T12:00:00.731Z") })));
  try {
  let cursor: string | null = null;
  const ids: string[] = [];
  for (let page = 0; page < 4; page++) {
    const response = await request.get(`/api/posts/${post.insertedId}/comments?limit=3${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    expect(response.ok()).toBe(true);
    const json: { data: { comments: Array<{ _id: string }> }; nextCursor: string | null } = await response.json();
    ids.push(...json.data.comments.map((comment: any) => comment._id));
    cursor = json.nextCursor;
    if (!cursor) break;
  }
  expect(new Set(ids).size).toBe(8);
  } finally {
    await db.collection("comments").deleteMany({ _id: { $in: Object.values(inserted.insertedIds) } });
    await db.collection("posts").deleteOne({ _id: post.insertedId });
    await db.close();
  }
});
