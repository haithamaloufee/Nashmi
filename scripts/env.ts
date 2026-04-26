import { existsSync, readFileSync } from "fs";
import path from "path";

function loadEnvFile(envFile: string, options: { override?: boolean; protectedKeys?: Set<string> } = {}) {
  const envPath = path.join(process.cwd(), envFile);
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!key || options.protectedKeys?.has(key)) continue;
    if (options.override || !process.env[key]) process.env[key] = value;
  }
}

export function loadEnv() {
  const protectedKeys = new Set(Object.keys(process.env));
  loadEnvFile(".env", { protectedKeys });
  loadEnvFile(".env.local", { override: true, protectedKeys });
}

export function formatSafeError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown error";
  const message = error.message.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<credentials>@");
  return `${error.name}: ${message}`;
}
