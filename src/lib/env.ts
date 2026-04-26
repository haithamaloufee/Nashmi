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

export function validateRuntimeEnv(options: { requireDatabase?: boolean; requireAuth?: boolean } = {}) {
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
  check("MONGODB_SERVER_SELECTION_TIMEOUT_MS", getServerSelectionTimeoutMs);
  check("MAX_UPLOAD_SIZE_MB", getMaxUploadSizeBytes);

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}
