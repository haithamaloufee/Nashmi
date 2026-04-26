import { createHash } from "crypto";

const dangerousKeyPattern = /[$.]/;

export function assertNoDangerousKeys(value: unknown, path = "body") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDangerousKeys(item, `${path}.${index}`));
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (dangerousKeyPattern.test(key)) {
      const error = new Error(`Dangerous key rejected at ${path}.${key}`);
      error.name = "DangerousKeyError";
      throw error;
    }
    assertNoDangerousKeys((value as Record<string, unknown>)[key], `${path}.${key}`);
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function hashSensitive(value: string | null | undefined) {
  if (!value) return null;
  const secret = process.env.JWT_SECRET || "dev-secret";
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function getUserAgent(request: Request) {
  return request.headers.get("user-agent") || "unknown";
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(input: T, keys: readonly K[]) {
  const output = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (input[key] !== undefined) output[key] = input[key];
  });
  return output;
}
