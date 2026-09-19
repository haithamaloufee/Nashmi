const baseUrl = (process.env.SMOKE_BASE_URL || "https://nashmii.vercel.app").replace(/\/$/, "");
const expectedSha = process.env.EXPECTED_GIT_SHA?.trim();
const routes = ["/", "/laws", "/parties", "/updates", "/login", "/api/platform/indicators", "/api/version"];

async function main() {
  for (const route of routes) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${route}`, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const elapsedMs = Math.round(performance.now() - started);
    if (!response.ok) throw new Error(`${route} returned ${response.status}`);
    console.log(`${route} ${response.status} ${elapsedMs}ms`);
  }

  const versionResponse = await fetch(`${baseUrl}/api/version`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const version = await versionResponse.json() as { sha?: string; environment?: string };
  if (!version.sha || version.sha === "local") throw new Error("Public deployment does not expose a Vercel Git SHA");
  if (expectedSha && version.sha !== expectedSha && !version.sha.startsWith(expectedSha) && !expectedSha.startsWith(version.sha)) {
    throw new Error(`Deployment SHA mismatch: expected ${expectedSha.slice(0, 12)}, received ${version.sha.slice(0, 12)}`);
  }
  if (version.environment !== "production") throw new Error(`Expected production environment, received ${version.environment}`);
  console.log(`deployment ${version.sha.slice(0, 12)} (${version.environment})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Production smoke test failed");
  process.exit(1);
});
