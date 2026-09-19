const baseUrl = (process.env.SMOKE_BASE_URL || "https://nashmii.vercel.app").replace(/\/$/, "");
const expectedSha = process.env.EXPECTED_GIT_SHA?.trim();
const routes = ["/", "/laws", "/parties", "/updates", "/login", "/api/platform/indicators", "/api/health", "/api/version"];
const RETRIES = 5;

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(route: string, init: RequestInit = {}, accept: (response: Response) => boolean = (response) => response.ok) {
  let lastStatus = 0;
  let lastError = "unknown";
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000)
      });
      const elapsedMs = Math.round(performance.now() - started);
      lastStatus = response.status;
      if (accept(response)) return { response, elapsedMs, attempt };
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.name : "request_failed";
    }
    if (attempt < RETRIES) await delay(Math.min(8_000, 750 * 2 ** (attempt - 1)));
  }
  throw new Error(`${route} did not become ready after ${RETRIES} attempts (${lastStatus || lastError})`);
}

function assertSecurityHeaders(response: Response, route: string) {
  if (!response.headers.get("x-request-id")) throw new Error(`${route} is missing X-Request-Id`);
  if (!response.headers.get("x-content-type-options")?.includes("nosniff")) throw new Error(`${route} is missing nosniff`);
  if (!response.headers.get("content-security-policy")) throw new Error(`${route} is missing Content-Security-Policy`);
}

function shaMatches(received: string, expected: string) {
  return received === expected || received.startsWith(expected) || expected.startsWith(received);
}

async function waitForExpectedVersion() {
  let lastSha = "unknown";
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const { response } = await fetchWithRetry("/api/version");
    const version = (await response.json()) as { sha?: string; environment?: string };
    lastSha = version.sha || "unknown";
    const validSha = lastSha !== "local" && lastSha !== "unknown";
    const expectedReached = !expectedSha || (validSha && shaMatches(lastSha, expectedSha));
    if (validSha && expectedReached && version.environment === "production") return version;
    if (attempt < RETRIES) await delay(Math.min(8_000, 1_000 * 2 ** (attempt - 1)));
  }
  const reason = expectedSha && !shaMatches(lastSha, expectedSha) ? "deployment propagation timeout" : "invalid production fingerprint";
  throw new Error(`${reason}: expected ${expectedSha?.slice(0, 12) || "a production SHA"}, received ${lastSha.slice(0, 12)}`);
}

async function main() {
  for (const route of routes) {
    const { response, elapsedMs, attempt } = await fetchWithRetry(route);
    assertSecurityHeaders(response, route);
    console.log(`${route} ${response.status} ${elapsedMs}ms${attempt > 1 ? ` attempt=${attempt}` : ""}`);
  }

  const healthResponse = await fetchWithRetry("/api/health");
  const health = (await healthResponse.response.json()) as { data?: { status?: string; service?: string } };
  if (health.data?.status !== "ok" || health.data?.service !== "nashmi") throw new Error("Health endpoint returned an invalid contract");

  const protectedRoute = await fetchWithRetry("/admin", { redirect: "manual" }, (response) => response.status === 307);
  if (protectedRoute.response.headers.get("location") !== "/login") throw new Error("Protected route did not redirect to /login");
  if (!protectedRoute.response.headers.get("cache-control")?.includes("no-store")) throw new Error("Protected redirect is cacheable");
  console.log(`/admin ${protectedRoute.response.status} protected no-store`);

  const version = await waitForExpectedVersion();
  console.log(`deployment ${version.sha!.slice(0, 12)} (${version.environment})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Production smoke test failed");
  process.exit(1);
});
