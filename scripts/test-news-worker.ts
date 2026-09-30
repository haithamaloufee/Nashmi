import assert from "node:assert/strict";
import worker from "../cloudflare/news-refresh-worker/src/index";
import { verifyNewsRefreshSignatureWithSecret } from "../src/lib/news/securityCore";

async function main() {
  const env = { NASHMI_REFRESH_URL: "https://nashmi.haitham.website/api/internal/news/refresh", NEWS_REFRESH_SECRET: "test-refresh-".padEnd(64, "r"), NEWS_DISCOVERY_SECRET: "test-discover-".padEnd(64, "d") };
  const originalFetch = globalThis.fetch;
  const requests: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    assert.equal(new URL(request.url).origin, "https://nashmi.haitham.website");
    const secret = path.endsWith("discover") ? env.NEWS_DISCOVERY_SECRET : env.NEWS_REFRESH_SECRET;
    verifyNewsRefreshSignatureWithSecret(request, secret, Date.now(), path, "POST");
    assert.throws(() => verifyNewsRefreshSignatureWithSecret(request, path.endsWith("discover") ? env.NEWS_REFRESH_SECRET : env.NEWS_DISCOVERY_SECRET, Date.now(), path, "POST"), /SIGNATURE_INVALID/);
    return Response.json({ ok: true, data: { published: 0 } });
  };
  try {
    for (const [cron, path] of [["30 * * * *", "/api/internal/news/discover"], ["0 3 * * *", "/api/internal/news/refresh"]]) {
      const jobs: Promise<unknown>[] = [];
      const before = requests.length;
      await worker.scheduled({ cron, scheduledTime: Date.now() }, env, { waitUntil: (job) => jobs.push(job) });
      assert.equal(jobs.length, 1);
      await Promise.all(jobs);
      assert.equal(requests.length, before + 1);
      assert.equal(new URL(requests.at(-1)!.url).pathname, path);
    }
    const ignored: Promise<unknown>[] = [];
    await worker.scheduled({ cron: "0 * * * *", scheduledTime: Date.now() }, env, { waitUntil: (job) => ignored.push(job) });
    assert.equal(ignored.length, 0, "unknown schedules must not publish");
    const health = await worker.fetch(new Request("https://worker.example/health"));
    assert.equal(health.status, 200);
    assert.equal(requests.length, 2, "health must not invoke either news job");
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    const failed: Promise<unknown>[] = [];
    await worker.scheduled({ cron: "30 * * * *", scheduledTime: Date.now() }, env, { waitUntil: (job) => failed.push(job) });
    await assert.rejects(failed[0], /discover failed \(503\)/);
    console.log("News Worker: Cron routing, server HMAC interoperability, separate secrets, health and job failure passed (mocked transport).");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "NEWS_WORKER_TEST_FAILED"); process.exit(1); });
