import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

type Budget = { warnKb: number; maxKb: number };

const budgets: Record<string, Budget> = {
  "/laws": { warnKb: 140, maxKb: 160 },
  "/updates": { warnKb: 160, maxKb: 180 },
  "/chat": { warnKb: 185, maxKb: 215 },
  "/parties": { warnKb: 140, maxKb: 175 },
  "/surveys": { warnKb: 140, maxKb: 175 }
};

const nextDir = path.join(process.cwd(), ".next");
const manifest = JSON.parse(readFileSync(path.join(nextDir, "app-build-manifest.json"), "utf8")) as { pages: Record<string, string[]> };

function routeFiles(route: string) {
  const key = `${route === "/" ? "" : route}/page` || "/page";
  const files = manifest.pages[key];
  if (!files) throw new Error(`No build manifest entry found for ${route} (${key})`);
  return [...new Set(files.filter((file) => file.endsWith(".js")))];
}

function gzipSize(files: string[]) {
  return files.reduce((total, file) => total + gzipSync(readFileSync(path.join(nextDir, file))).byteLength, 0);
}

let failed = false;
const report = Object.entries(budgets).map(([route, budget]) => {
  const files = routeFiles(route);
  const gzipBytes = gzipSize(files);
  const gzipKb = Number((gzipBytes / 1024).toFixed(1));
  const rawKb = Number((files.reduce((total, file) => total + statSync(path.join(nextDir, file)).size, 0) / 1024).toFixed(1));
  const status = gzipKb > budget.maxKb ? "fail" : gzipKb > budget.warnKb ? "warn" : "pass";
  if (status === "fail") failed = true;
  return { route, gzipKb, rawKb, chunks: files.length, ...budget, status };
});

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), routes: report }, null, 2));
for (const item of report.filter((entry) => entry.status !== "pass")) {
  console.warn(`bundle ${item.status}: ${item.route} ${item.gzipKb}KB (warn ${item.warnKb}KB, max ${item.maxKb}KB)`);
}
if (failed) process.exitCode = 1;
