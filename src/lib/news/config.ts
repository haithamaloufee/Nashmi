import { InvalidEnvError, MissingEnvError, getGeminiBoolean, getGeminiNumber, getOptionalEnv } from "@/lib/env";

export function getNewsConfig() {
  const secret = getOptionalEnv("NEWS_REFRESH_SECRET");
  if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && (!secret || secret.length < 32)) {
    if (!secret) throw new MissingEnvError("NEWS_REFRESH_SECRET");
    throw new InvalidEnvError("NEWS_REFRESH_SECRET", "must be at least 32 characters in production");
  }

  return {
    refreshSecret: secret || "development-news-refresh-secret-only",
    autoPublish: getGeminiBoolean("NEWS_AUTO_PUBLISH", false),
    maxNewItems: Math.floor(getGeminiNumber("NEWS_MAX_NEW_ITEMS", 10, 1, 10)),
    retentionDays: Math.floor(getGeminiNumber("NEWS_RETENTION_DAYS", 7, 1, 30)),
    discoveryModel: getOptionalEnv("NEWS_GEMINI_MODEL") || "gemini-3.5-flash-lite",
    discoveryFallbackModel: getOptionalEnv("NEWS_GEMINI_FALLBACK_MODEL") || "gemini-3.1-flash-lite"
  };
}
