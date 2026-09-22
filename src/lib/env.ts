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
    // WHATWG URL rejects valid MongoDB seed-list URIs containing multiple
    // hosts. Parse only the database path here and leave full connection-string
    // semantics to the MongoDB driver.
    const schemeEnd = uri.indexOf("://") + 3;
    const pathStart = uri.indexOf("/", schemeEnd);
    if (pathStart === -1 || !uri.slice(schemeEnd, pathStart)) {
      throw new InvalidEnvError("MONGODB_URI", "must include a host and database name");
    }
    const queryStart = uri.indexOf("?", pathStart);
    const rawDatabaseName = uri.slice(pathStart + 1, queryStart === -1 ? undefined : queryStart);
    const databaseName = decodeURIComponent(rawDatabaseName);
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

export function getRateLimitSecret() {
  const secret = getOptionalEnv("RATE_LIMIT_SECRET");
  if (secret) {
    if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && secret.length < 32) {
      throw new InvalidEnvError("RATE_LIMIT_SECRET", "must be at least 32 characters in production");
    }
    return secret;
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new MissingEnvError("RATE_LIMIT_SECRET");
  }
  return getOptionalEnv("JWT_SECRET") || "development-assistant-rate-limit-secret";
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

function getUploadSizeBytes(name: string, defaultMb: number, maxAllowedMb: number) {
  const raw = getOptionalEnv(name) || getOptionalEnv("MAX_UPLOAD_SIZE_MB") || String(defaultMb);
  const maxMb = Number(raw);
  if (!Number.isFinite(maxMb) || maxMb <= 0 || maxMb > maxAllowedMb) {
    throw new InvalidEnvError(name, `must be a number between 1 and ${maxAllowedMb}`);
  }
  return maxMb * 1024 * 1024;
}

export function getMaxImageUploadSizeBytes() {
  return getUploadSizeBytes("MAX_IMAGE_UPLOAD_SIZE_MB", 5, 25);
}

export function getMaxVideoUploadSizeBytes() {
  const raw = getOptionalEnv("MAX_VIDEO_UPLOAD_SIZE_MB") || "100";
  const maxMb = Number(raw);
  if (!Number.isFinite(maxMb) || maxMb <= 0 || maxMb > 100) {
    throw new InvalidEnvError("MAX_VIDEO_UPLOAD_SIZE_MB", "must be a number between 1 and 100");
  }
  return maxMb * 1024 * 1024;
}

export function getMaxDocumentUploadSizeBytes() {
  return getUploadSizeBytes("MAX_DOCUMENT_UPLOAD_SIZE_MB", 20, 50);
}

export function getR2AccountId() {
  return getRequiredEnv("R2_ACCOUNT_ID");
}

export function getR2AccessKeyId() {
  return getRequiredEnv("R2_ACCESS_KEY_ID");
}

export function getR2SecretAccessKey() {
  return getRequiredEnv("R2_SECRET_ACCESS_KEY");
}

export function getR2BucketName() {
  return getRequiredEnv("R2_BUCKET_NAME");
}

export function getR2Endpoint() {
  const configured = getOptionalEnv("R2_ENDPOINT");
  const endpoint = configured || `https://${getR2AccountId()}.r2.cloudflarestorage.com`;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new InvalidEnvError("R2_ENDPOINT", "must be a valid HTTPS URL");
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".r2.cloudflarestorage.com") || url.username || url.password) {
    throw new InvalidEnvError("R2_ENDPOINT", "must use the Cloudflare R2 HTTPS S3 endpoint");
  }
  return url.origin;
}

export function getR2PublicBaseUrl() {
  const value = getOptionalEnv("R2_PUBLIC_BASE_URL");
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidEnvError("R2_PUBLIC_BASE_URL", "must be a valid HTTPS URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new InvalidEnvError("R2_PUBLIC_BASE_URL", "must be a clean HTTPS origin or path");
  }
  return value.replace(/\/+$/, "");
}

export function getR2UploadExpirySeconds() {
  const raw = getOptionalEnv("R2_UPLOAD_EXPIRY_SECONDS") || "300";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 60 || value > 900) {
    throw new InvalidEnvError("R2_UPLOAD_EXPIRY_SECONDS", "must be an integer between 60 and 900");
  }
  return value;
}

export function getR2DownloadExpirySeconds() {
  const raw = getOptionalEnv("R2_DOWNLOAD_EXPIRY_SECONDS") || "300";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 30 || value > 900) {
    throw new InvalidEnvError("R2_DOWNLOAD_EXPIRY_SECONDS", "must be an integer between 30 and 900");
  }
  return value;
}

export function getR2EnvironmentPrefix() {
  const fallback = process.env.VERCEL_ENV === "preview"
    ? "preview"
    : process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
      ? "production"
      : "development";
  const raw = getOptionalEnv("R2_ENV_PREFIX") || fallback;
  const prefix = raw.replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9][a-z0-9/_-]{0,63}$/i.test(prefix) || prefix.includes("..")) {
    throw new InvalidEnvError("R2_ENV_PREFIX", "must be a safe object-key prefix");
  }
  return prefix;
}

function getQuotaBytes(name: string, defaultMb: number, maxMb: number) {
  const raw = getOptionalEnv(name) || String(defaultMb);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > maxMb) {
    throw new InvalidEnvError(name, `must be a number between 1 and ${maxMb}`);
  }
  return value * 1024 * 1024;
}

export function getUserMediaQuotaBytes() {
  return getQuotaBytes("R2_USER_MEDIA_QUOTA_MB", 1024, 102400);
}

export function getPublisherMediaQuotaBytes() {
  return getQuotaBytes("R2_PUBLISHER_MEDIA_QUOTA_MB", 5120, 512000);
}

export function getDailyUploadQuotaBytes() {
  return getQuotaBytes("R2_DAILY_UPLOAD_QUOTA_MB", 512, 102400);
}

export function hasR2Credentials() {
  return Boolean(
    getOptionalEnv("R2_ACCOUNT_ID") &&
    getOptionalEnv("R2_ACCESS_KEY_ID") &&
    getOptionalEnv("R2_SECRET_ACCESS_KEY") &&
    getOptionalEnv("R2_BUCKET_NAME")
  );
}

export function hasBlobReadWriteToken() {
  return Boolean(getOptionalEnv("BLOB_READ_WRITE_TOKEN"));
}

export function hasBlobCredentials() {
  if (hasBlobReadWriteToken()) return true;
  return Boolean(getOptionalEnv("BLOB_STORE_ID") && (getOptionalEnv("VERCEL_OIDC_TOKEN") || process.env.VERCEL));
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
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) check("RATE_LIMIT_SECRET", getRateLimitSecret);
  if (options.requireGemini) check("GEMINI_API_KEY", getGeminiApiKey);
  check("MONGODB_SERVER_SELECTION_TIMEOUT_MS", getServerSelectionTimeoutMs);
  check("MAX_UPLOAD_SIZE_MB", getMaxUploadSizeBytes);
  check("MAX_IMAGE_UPLOAD_SIZE_MB", getMaxImageUploadSizeBytes);
  check("MAX_VIDEO_UPLOAD_SIZE_MB", getMaxVideoUploadSizeBytes);
  check("MAX_DOCUMENT_UPLOAD_SIZE_MB", getMaxDocumentUploadSizeBytes);
  if (getOptionalEnv("STORAGE_PROVIDER") === "cloudflare_r2") {
    check("R2_ACCOUNT_ID", getR2AccountId);
    check("R2_ACCESS_KEY_ID", getR2AccessKeyId);
    check("R2_SECRET_ACCESS_KEY", getR2SecretAccessKey);
    check("R2_BUCKET_NAME", getR2BucketName);
    check("R2_ENDPOINT", getR2Endpoint);
    check("R2_PUBLIC_BASE_URL", getR2PublicBaseUrl);
    check("R2_UPLOAD_EXPIRY_SECONDS", getR2UploadExpirySeconds);
    check("R2_DOWNLOAD_EXPIRY_SECONDS", getR2DownloadExpirySeconds);
    check("R2_ENV_PREFIX", getR2EnvironmentPrefix);
    check("R2_USER_MEDIA_QUOTA_MB", getUserMediaQuotaBytes);
    check("R2_PUBLISHER_MEDIA_QUOTA_MB", getPublisherMediaQuotaBytes);
    check("R2_DAILY_UPLOAD_QUOTA_MB", getDailyUploadQuotaBytes);
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    if (!hasR2Credentials() && !hasBlobCredentials()) missing.push("Cloudflare R2 credentials or transitional Vercel Blob credentials");
  }
  check("GEMINI_ENABLE_GOOGLE_SEARCH", () => getGeminiBoolean("GEMINI_ENABLE_GOOGLE_SEARCH", false));
  check("GEMINI_MAX_HISTORY_MESSAGES", () => getGeminiNumber("GEMINI_MAX_HISTORY_MESSAGES", 30, 2, 80));
  check("GEMINI_MAX_LAW_CONTEXT_RESULTS", () => getGeminiNumber("GEMINI_MAX_LAW_CONTEXT_RESULTS", 6, 0, 12));
  check("GEMINI_MAX_CONTEXT_CHARS", () => getGeminiNumber("GEMINI_MAX_CONTEXT_CHARS", 16_000, 4_000, 40_000));
  check("GEMINI_MAX_OUTPUT_TOKENS", () => getGeminiNumber("GEMINI_MAX_OUTPUT_TOKENS", 1_200, 256, 2_048));
  check("GEMINI_TEMPERATURE", () => getGeminiNumber("GEMINI_TEMPERATURE", 0.3, 0, 1));
  check("NEWS_AUTO_PUBLISH", () => getGeminiBoolean("NEWS_AUTO_PUBLISH", false));
  check("NEWS_MAX_NEW_ITEMS", () => getGeminiNumber("NEWS_MAX_NEW_ITEMS", 8, 1, 15));
  check("NEWS_ACTIVE_HOURS", () => getGeminiNumber("NEWS_ACTIVE_HOURS", 24, 1, 72));
  check("NEWS_RETENTION_DAYS", () => getGeminiNumber("NEWS_RETENTION_DAYS", 7, 1, 30));
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    check("NEWS_REFRESH_SECRET", () => {
      const secret = getRequiredEnv("NEWS_REFRESH_SECRET");
      if (secret.length < 32) throw new InvalidEnvError("NEWS_REFRESH_SECRET", "must be at least 32 characters in production");
    });
  }

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}
