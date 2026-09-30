import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";

async function main() {
  const [deployment, url, kind = "ticker"] = process.argv.slice(2);
  if (!/^dpl_[A-Za-z0-9]+$/.test(deployment || "") || !/^https:\/\/nashmi-[a-z0-9-]+\.vercel\.app$/.test(url || "")) throw new Error("PREVIEW_DEPLOYMENT_REQUIRED");
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("RUN_WITH_NPM_REQUIRED");
  const run = (args: string[], env = process.env, quiet = false) => new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { shell: false, env, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit" });
    if (quiet) { child.stdout?.on("data", () => {}); child.stderr?.on("data", () => {}); }
    child.on("error", () => reject(new Error("PREVIEW_BROWSER_COMMAND_FAILED")));
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error("PREVIEW_BROWSER_COMMAND_FAILED")));
  });
  const headersPath = ".env.news-audit.local/preview-bypass-headers.txt";
  await run([npmCli, "exec", "--yes", "--package=vercel@latest", "--", "vercel", "curl", "/api/version", "--deployment", deployment, "--", "--silent", "--show-error", "--header", "x-vercel-set-bypass-cookie:true", "--dump-header", headersPath, "--output", ".env.news-audit.local/preview-browser-version.json"], process.env, true);
  const cookie = /^set-cookie:\s*_vercel_jwt=([^;\r\n]+)/im.exec(readFileSync(headersPath, "utf8"))?.[1];
  if (!cookie) throw new Error("OFFICIAL_PREVIEW_BYPASS_COOKIE_UNAVAILABLE");
  const credentials = kind === "publication" ? parse(readFileSync(".env.news-admin-test.local")) : {};
  const env = { ...process.env, ...credentials, E2E_BASE_URL: url, E2E_PREVIEW_BYPASS_COOKIE: cookie, E2E_NEWS_PREVIEW_PUBLICATION: kind === "publication" ? "true" : "false" };
  await run([npmCli, "exec", "--", "playwright", "test", kind === "publication" ? "tests/news-preview-publication.spec.ts" : kind === "smoke" ? "tests/production-smoke.spec.ts" : "tests/news-ticker.spec.ts", "--project=public", `--output=test-results/news-preview-${kind}`, ...(kind === "smoke" ? ["--grep", "chat keeps|critical public routes|redesigned navigation|live-news ticker|login recovery|critical public pages"] : [])], env);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "PREVIEW_BROWSER_FAILED"); process.exit(1); });
