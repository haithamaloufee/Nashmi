import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getClientIp, hashSensitive, normalizeEmail } from "../src/lib/security";
import { consumeRateLimitBucket, retryAfterSeconds } from "../src/lib/rateLimitCore";

async function main() {
  const database = await MongoMemoryServer.create();
  const uri = database.getUri("nashmi_signup_test");
  process.env.JWT_SECRET = "signup-runtime-test-only-secret";
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  const [{ default: mongoose }, { default: RateLimitBucket }, { default: User }] = await Promise.all([
    import("mongoose"),
    import("../src/models/RateLimitBucket"),
    import("../src/models/User")
  ]);

  try {
    await mongoose.connect(uri);
    await User.init();
    const testUser = (suffix: string) => ({
      name: `Citizen ${suffix}`,
      email: `${suffix}@nashmi.test`,
      emailNormalized: `${suffix}@nashmi.test`,
      passwordHash: "test-only-hash",
      role: "citizen" as const,
      provider: "credentials" as const,
      status: "active" as const,
      language: "ar" as const
    });
    await User.create(testUser("first"), testUser("second"));
    await User.create({ ...testUser("token"), passwordSetupTokenHash: "unique-setup-token" });
    await assert.rejects(
      User.create({ ...testUser("duplicate"), passwordSetupTokenHash: "unique-setup-token" }),
      /E11000/
    );
    const consumeRateLimit = (key: string, limit: number, windowMs: number) =>
      consumeRateLimitBucket(RateLimitBucket, key, limit, windowMs);
    const first = new Request("https://nashmi.test/api/auth/signup", { headers: { "x-vercel-forwarded-for": "192.0.2.1" } });
    const second = new Request("https://nashmi.test/api/auth/signup", { headers: { "x-vercel-forwarded-for": "192.0.2.2" } });
    const firstKey = `signup:ip:${hashSensitive(getClientIp(first))}`;
    const secondKey = `signup:ip:${hashSensitive(getClientIp(second))}`;
    assert.notEqual(firstKey, secondKey);
    assert.equal(getClientIp(new Request("https://nashmi.test", { headers: { "x-vercel-forwarded-for": "not-an-ip" } })), "unknown");
    assert.equal(normalizeEmail(" Test@Example.COM "), "test@example.com");

    const normal = await consumeRateLimit(firstKey, 3, 60_000);
    assert.equal(normal.ok, true);
    const burst = await Promise.all(Array.from({ length: 4 }, () => consumeRateLimit(firstKey, 3, 60_000)));
    assert.equal(burst.filter((result) => result.ok).length, 2);
    assert.equal(burst.filter((result) => !result.ok).length, 2);
    assert.equal((await consumeRateLimit(secondKey, 3, 60_000)).ok, true);

    const limited = await consumeRateLimit(firstKey, 3, 60_000);
    assert.equal(limited.ok, false);
    assert.ok(retryAfterSeconds(limited.resetAt) >= 1);
  } finally {
    await mongoose.disconnect();
    await database.stop();
  }
  console.log("Signup rate-limit tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
