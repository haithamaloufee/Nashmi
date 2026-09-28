import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  const reconcile = readFileSync("scripts/storage-reconcile-r2.ts", "utf8");
  assert.match(reconcile, /intentionally read-only/);
  assert.match(reconcile, /readyObjectMissing/);
  assert.match(reconcile, /r2ObjectWithoutDatabaseRecord/);
  const mediaRoute = readFileSync("src/app/api/media/[id]/route.ts", "utf8");
  assert.match(mediaRoute, /createDownloadUrl/);
  assert.doesNotMatch(mediaRoute, /legacySource|validatedLegacyBlobUrl/);
  const provider = readFileSync("src/models/MediaAsset.ts", "utf8");
  assert.match(provider, /enum: \["cloudflare_r2", "local_dev"\]/);
  console.log("R2 reconciliation and legacy storage retirement tests passed.");
}

main();
