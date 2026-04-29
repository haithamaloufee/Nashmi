const placeholderPattern = /^(your_|replace_|change_me|changeme|example_|<|$)/i;

export class MissingEnvError extends Error {
  constructor(public readonly variableName: string) {
    super(`Missing required environment variable: ${variableName}`);
    this.name = "MissingEnvError";
  }
}

export class InvalidEnvError extends Error {
  constructor(
    public readonly variableName: string,
    message: string
  ) {
    super(`Invalid environment variable ${variableName}: ${message}`);
    this.name = "InvalidEnvError";
  }
}

export function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value || placeholderPattern.test(value)) return undefined;
  return value;
}

export function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);
  if (!value) throw new MissingEnvError(name);
  return value;
}

export function getMongoUri() {
  const uri = getRequiredEnv("MONGODB_URI");
  if (uri.includes("<") || uri.includes(">")) {
    throw new InvalidEnvError("MONGODB_URI", "placeholder values must be replaced");
  }
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new InvalidEnvError("MONGODB_URI", "must start with mongodb:// or mongodb+srv://");
  }
  try {
    const parsed = new URL(uri);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    if (!databaseName) {
      throw new InvalidEnvError("MONGODB_URI", "must include a database name");
    }
    if (/[\\/."$\s]/.test(databaseName)) {
      throw new InvalidEnvError("MONGODB_URI", "contains an invalid database name");
    }
  } catch (error) {
    if (error instanceof InvalidEnvError) throw error;
    throw new InvalidEnvError("MONGODB_URI", "is not a valid MongoDB connection string");
  }
  return uri;
}

export function getJwtSecret() {
  const secret = getRequiredEnv("JWT_SECRET");
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new InvalidEnvError("JWT_SECRET", "must be at least 32 characters in production");
  }
  return secret;
}

export function getServerSelectionTimeoutMs() {
  const raw = getOptionalEnv("MONGODB_SERVER_SELECTION_TIMEOUT_MS") || "5000";
  const timeout = Number(raw);
  if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 60000) {
    throw new InvalidEnvError("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "must be a number between 1000 and 60000");
  }
  return timeout;
}

export function getMaxUploadSizeBytes() {
  const raw = getOptionalEnv("MAX_UPLOAD_SIZE_MB") || "3";
  const maxMb = Number(raw);
  if (!Number.isFinite(maxMb) || maxMb <= 0 || maxMb > 25) {
    throw new InvalidEnvError("MAX_UPLOAD_SIZE_MB", "must be a number between 1 and 25");
  }
  return maxMb * 1024 * 1024;
}

export function getGeminiApiKey() {
  return getRequiredEnv("GEMINI_API_KEY");
}

export function getGeminiBoolean(name: string, defaultValue: boolean) {
  const raw = getOptionalEnv(name);
  if (!raw) return defaultValue;
  if (["true", "1", "yes"].includes(raw.toLowerCase())) return true;
  if (["false", "0", "no"].includes(raw.toLowerCase())) return false;
  throw new InvalidEnvError(name, "must be true or false");
}

export function getGeminiNumber(name: string, defaultValue: number, min: number, max: number) {
  const raw = getOptionalEnv(name);
  if (!raw) return defaultValue;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new InvalidEnvError(name, `must be a number between ${min} and ${max}`);
  }
  return value;
}

export function validateRuntimeEnv(options: { requireDatabase?: boolean; requireAuth?: boolean; requireGemini?: boolean } = {}) {
  const missing: string[] = [];
  const invalid: string[] = [];

  const check = (name: string, fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      if (error instanceof MissingEnvError) missing.push(error.variableName);
      else if (error instanceof InvalidEnvError) invalid.push(error.message);
      else invalid.push(`Invalid environment variable: ${name}`);
    }
  };

  if (options.requireDatabase) check("MONGODB_URI", getMongoUri);
  if (options.requireAuth || process.env.NODE_ENV === "production") check("JWT_SECRET", getJwtSecret);
  if (options.requireGemini) check("GEMINI_API_KEY", getGeminiApiKey);
  check("MONGODB_SERVER_SELECTION_TIMEOUT_MS", getServerSelectionTimeoutMs);
  check("MAX_UPLOAD_SIZE_MB", getMaxUploadSizeBytes);
  check("GEMINI_ENABLE_GOOGLE_SEARCH", () => getGeminiBoolean("GEMINI_ENABLE_GOOGLE_SEARCH", false));
  check("GEMINI_MAX_HISTORY_MESSAGES", () => getGeminiNumber("GEMINI_MAX_HISTORY_MESSAGES", 30, 2, 80));
  check("GEMINI_MAX_LAW_CONTEXT_RESULTS", () => getGeminiNumber("GEMINI_MAX_LAW_CONTEXT_RESULTS", 6, 0, 12));
  check("GEMINI_TEMPERATURE", () => getGeminiNumber("GEMINI_TEMPERATURE", 0.3, 0, 1));

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}
