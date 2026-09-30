import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { signNewsRefreshWithSecret } from "../src/lib/news/securityCore";

const deployment = process.argv[2];
const action = process.argv[3] || "check";
const configuration = parse(readFileSync(".env.news-preview.local"));

async function request(path: string, method: "GET" | "POST", secret: string) {
  if (!/^dpl_[A-Za-z0-9]+$/.test(deployment || "")) throw new Error("PREVIEW_DEPLOYMENT_ID_REQUIRED");
  if (!secret || secret.length < 32) throw new Error("PREVIEW_REQUEST_SECRET_REQUIRED");
  const timestamp = String(Date.now());
  const signature = signNewsRefreshWithSecret(timestamp, secret, path, method);
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("PREVIEW_REQUEST_RUN_WITH_NPM_REQUIRED");
  const args = [npmCli, "exec", "--yes", "--package=vercel@latest", "--", "vercel", "curl", path, "--deployment", deployment, "--", "--silent", "--show-error", "--fail-with-body", "--request", method,
    "--header", `x-nashmi-news-timestamp:${timestamp}`, "--header", `x-nashmi-news-signature:${signature}`];
  // Run npm's JavaScript entry point directly; no shell concatenation on Windows.
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", () => { /* CLI logs are intentionally not emitted. */ });
    child.on("error", () => reject(new Error("VERCEL_PREVIEW_REQUEST_FAILED")));
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error("VERCEL_PREVIEW_REQUEST_FAILED")));
  });
  let body;
  try { body = JSON.parse(output); }
  catch { throw new Error("PREVIEW_RESPONSE_NOT_JSON"); }
  if (!body.ok) throw new Error("PREVIEW_API_REQUEST_FAILED");
  return body.data;
}

async function main() {
  if (!["check", "discover", "select"].includes(action)) throw new Error("PREVIEW_ACTION_INVALID");
  const check = await request("/api/internal/news/preview-check", "GET", configuration.NEWS_DISCOVERY_SECRET);
  if (!check.isolated || check.database !== "nashmi_preview" || check.branch !== "feat/news-discovery-redesign" || check.mode !== "shadow") throw new Error("PREVIEW_RUNTIME_ISOLATION_REQUIRED");
  console.log(JSON.stringify({ inspection: check }));
  if (action === "discover") console.log(JSON.stringify({ discovery: await request("/api/internal/news/discover", "POST", configuration.NEWS_DISCOVERY_SECRET) }));
  if (action === "select") console.log(JSON.stringify({ editorial: await request("/api/internal/news/refresh", "POST", configuration.NEWS_REFRESH_SECRET) }));
}

main().catch((error) => {
  // Connection strings and credentials are never logged, including failures.
  console.error(error instanceof Error ? error.message : "PREVIEW_REQUEST_FAILED");
  process.exit(1);
});
