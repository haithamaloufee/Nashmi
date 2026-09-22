import "server-only";
import { hasR2Credentials } from "@/lib/env";
import { r2Storage } from "@/lib/storage/r2";

export function getObjectStorage() {
  if (!hasR2Credentials()) throw new Error("R2_STORAGE_NOT_CONFIGURED");
  return r2Storage;
}

export * from "@/lib/storage/types";
