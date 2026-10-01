import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

test("feed cursor preserves equal timestamps, filters and stable unique pages", async ({ request }) => {
  const runtime = JSON.parse(readFileSync("test-results/qa-runtime.json", "utf8"));
  if (!runtime.MONGODB_URI.startsWith("mongodb://127.0.0.1:") || !runtime.MONGODB_URI.includes("nashmi_ux_qa")) throw Error("Local QA only");
  const db = await mongoose.createConnection(runtime.MONGODB_URI).asPromise();
  const marker = `cursorqa${Date.now()}`;
  const timestamp = new Date("2020-01-01T12:00:00.731Z");
  const inserted = await db.collection("posts").insertMany(Array.from({ length: 14 }, (_, i) => ({ title: `${marker}-${i}`, content: "Synthetic cursor test", searchNormalized: marker, authorType: "admin", publishedAt: timestamp, status: "published", likesCount: 0, dislikesCount: 0, commentsCount: 0 })));
  try {
    const ids: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const params = new URLSearchParams({ search: marker, filter: "posts", limit: "5", from: "2019-12-31", to: "2020-01-02" });
      if (cursor) params.set("cursor", cursor);
      const response = await request.get(`/api/updates?${params}`);
      expect(response.ok()).toBe(true);
      const json = await response.json();
      ids.push(...json.data.updates.map((update: any) => update.item._id));
      cursor = json.nextCursor;
      if (!cursor) break;
    }
    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(14);
    const legacy = await request.get(`/api/updates?search=${marker}&cursor=${encodeURIComponent(timestamp.toISOString())}`);
    expect(legacy.ok()).toBe(true);
    expect((await legacy.json()).data.updates).toHaveLength(0);
    const invalid = await request.get("/api/updates?cursor=not-a-cursor");
    expect(invalid.status()).toBe(400);
  } finally {
    await db.collection("posts").deleteMany({ _id: { $in: Object.values(inserted.insertedIds) } });
    await db.close();
  }
});

test("mixed content chronological cursors retain date boundaries in both directions", async ({ request }) => {
  const runtime = JSON.parse(readFileSync("test-results/qa-runtime.json", "utf8"));
  if (!runtime.MONGODB_URI.startsWith("mongodb://127.0.0.1:") || !runtime.MONGODB_URI.includes("nashmi_ux_qa")) throw Error("Local QA only");
  const db = await mongoose.createConnection(runtime.MONGODB_URI).asPromise();
  const marker = `mixedqa${Date.now()}`;
  const inserted: Record<string, mongoose.Types.ObjectId[]> = {};
  try {
    for (const collection of ["posts", "polls", "surveys"]) {
      const documents = Array.from({ length: 6 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(), slug: `${marker}-${i}`, title: marker, question: marker, content: marker, description: marker, searchNormalized: marker, authorType: "admin", publishedAt: new Date(i === 0 ? "2018-01-01" : i === 5 ? "2022-01-01" : "2020-01-01T12:00:00Z"), status: collection === "polls" ? "active" : "published", options: [], likesCount: 0, dislikesCount: 0 }));
      inserted[collection] = documents.map(d => d._id);
      await db.collection(collection).insertMany(documents);
    }
    for (const sort of ["newest", "oldest"]) {
      const ids: string[] = [];
      let cursor: string | null = null;
      for (let n = 0; n < 6; n++) {
        const params = new URLSearchParams({ search: marker, limit: "5", sort, from: "2019-01-01", to: "2021-01-01" });
        if (cursor) params.set("cursor", cursor);
        const response = await request.get(`/api/updates?${params}`);
        expect(response.ok()).toBe(true);
        const json = await response.json();
        for (const update of json.data.updates) expect(update.publishedAt).toBe("2020-01-01T12:00:00.000Z");
        ids.push(...json.data.updates.map((u: any) => u.item._id));
        expect(json.data.totalCount).toBe(12);
        cursor = json.nextCursor;
        if (!cursor) break;
      }
      expect(ids).toHaveLength(12);
      expect(new Set(ids).size).toBe(12);
      expect(ids).toEqual([...ids].sort((a, b) => sort === "newest" ? b.localeCompare(a) : a.localeCompare(b)));
    }
    for (const cursor of ["not-a-cursor", "123", "2020-13-01T12:00:00.000Z", "2020-01-01T12:00:00.000Z~bad-id", "2020-01-01T12:00:00.000Z~000000000000000000000000~extra"]) {
      expect((await request.get(`/api/updates?cursor=${encodeURIComponent(cursor)}`)).status()).toBe(400);
    }
  } finally {
    for (const [collection, ids] of Object.entries(inserted)) await db.collection(collection).deleteMany({ _id: { $in: ids } });
    await db.close();
  }
});

test("SSR bootstrap and browser pagination do not skip equal-time posts", async ({ page }) => {
  const runtime = JSON.parse(readFileSync("test-results/qa-runtime.json", "utf8"));
  if (!runtime.MONGODB_URI.startsWith("mongodb://127.0.0.1:") || !runtime.MONGODB_URI.includes("nashmi_ux_qa")) throw Error("Local QA only");
  const db = await mongoose.createConnection(runtime.MONGODB_URI).asPromise();
  const marker = `browsercursorqa${Date.now()}`;
  const inserted = await db.collection("posts").insertMany(Array.from({ length: 35 }, (_, i) => ({ title: `${marker}-${i}`, content: "Synthetic local browser pagination fixture", searchNormalized: marker, authorType: "admin", publishedAt: new Date("2020-01-01T12:00:00.731Z"), status: "published", likesCount: 0, dislikesCount: 0, commentsCount: 0 })));
  try {
    await page.goto(`/updates?search=${marker}`);
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    const cards = page.locator("article").filter({ hasText: marker });
    for (let n = 0; n < 6 && await cards.count() < 35; n++) {
      const before = await cards.count();
      const sentinel = page.locator("[data-feed-sentinel]");
      if (await sentinel.count()) await sentinel.scrollIntoViewIfNeeded();
      else await page.getByRole("button", { name: "عرض المزيد", exact: true }).click();
      await expect.poll(() => cards.count()).toBeGreaterThan(before);
    }
    await expect(cards).toHaveCount(35);
    const titles = await cards.locator("h4").allTextContents();
    expect(new Set(titles).size).toBe(35);
  } finally {
    await db.collection("posts").deleteMany({ _id: { $in: Object.values(inserted.insertedIds) } });
    await db.close();
  }
});
