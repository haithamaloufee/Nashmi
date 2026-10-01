import { defineConfig, devices } from "@playwright/test";

const phase = process.env.UX_QA_PHASE || "final";
export default defineConfig({
  testDir: "./tests/ux",
  // Historical baseline mutations are a separate, single-engine phase.
  // A normal regression run must not overwrite the original inventory/images.
  testIgnore: process.env.UX_QA_INCLUDE_BASELINE ? [] : ["**/baseline*.spec.ts"],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  outputDir: `test-results/ux-${phase}`,
  reporter: [["list"], ["html", { outputFolder: `playwright-report/ux-${phase}`, open: "never" }], ["json", { outputFile: `test-results/ux-${phase}.json` }]],
  use: { baseURL: "http://127.0.0.1:3020", actionTimeout: 20_000, trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ]
});
