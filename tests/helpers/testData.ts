import { randomUUID } from "node:crypto";

export const E2E_RECORD_PREFIX = "e2e:nashmi:";

export function createE2eRunId() {
  return `${E2E_RECORD_PREFIX}${new Date().toISOString()}:${randomUUID()}`;
}

export function isE2eRecord(value: unknown) {
  return typeof value === "string" && value.startsWith(E2E_RECORD_PREFIX);
}
