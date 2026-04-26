import { formatSafeError, loadEnv } from "./env";
import { validateRuntimeEnv } from "../src/lib/env";

loadEnv();

try {
  const result = validateRuntimeEnv({ requireDatabase: true, requireAuth: true });
  if (!result.ok) {
    for (const variableName of result.missing) {
      console.error(`Missing required environment variable: ${variableName}`);
    }
    for (const message of result.invalid) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log("Environment validation succeeded.");
} catch (error) {
  console.error(formatSafeError(error));
  process.exit(1);
}
