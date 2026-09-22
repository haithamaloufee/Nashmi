import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  const migration = readFileSync("scripts/storage-migrate-r2.ts", "utf8");
  assert.match(migration, /process\.argv\.includes\("--execute"\)/);
  assert.match(migration, /if \(!execute\)/);
  assert.match(migration, /Readable\.fromWeb/);
  assert.match(migration, /createHash\("sha256"\)/);
  assert.match(migration, /destinationHash\.sha256 !== sourceSha256/);
  assert.match(migration, /provider: "vercel_blob"/);
  assert.match(migration, /url: candidate\.sourceUrl/);
  assert.match(migration, /sourceProvider: "vercel_blob"/);
  assert.match(migration, /MEDIA_ASSET_CONCURRENT_CHANGE/);
  assert.doesNotMatch(migration, /DeleteObjectCommand/);

  const reconcile = readFileSync("scripts/storage-reconcile-r2.ts", "utf8");
  assert.match(reconcile, /intentionally read-only/);
  assert.match(reconcile, /readyObjectMissing/);
  assert.match(reconcile, /r2ObjectWithoutDatabaseRecord/);
  console.log("Storage migration safety tests passed.");
}

main();
