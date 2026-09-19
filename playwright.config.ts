import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const externalBaseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const authDir = path.join(process.cwd(), "playwright", ".auth");
const roles = ["citizen", "party", "admin"] as const;
const configuredRoles = roles.filter((role) => {
  const prefix = `E2E_${role.toUpperCase()}`;
  return Boolean(process.env[`${prefix}_EMAIL`] && process.env[`${prefix}_PASSWORD`]);
});

const authProjects = configuredRoles.flatMap((role) => [
  {
    name: `setup-${role}`,
    testMatch: /auth\.setup\.ts/,
    use: { ...devices["Desktop Chrome"] }
  },
  {
    name: role,
    testMatch: /authenticated\.spec\.ts/,
    dependencies: [`setup-${role}`],
    use: {
      ...devices["Desktop Chrome"],
      storageState: path.join(authDir, `${role}.json`)
    }
  }
]);

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseUrl || "http://127.0.0.1:3006",
    trace: "retain-on-failure"
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npx next start -p 3006",
        url: "http://127.0.0.1:3006",
        reuseExistingServer: true,
        timeout: 120_000
      },
  projects: [
    {
      name: "public",
      testMatch: /(production-smoke|api-contracts)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    ...authProjects
  ]
});
