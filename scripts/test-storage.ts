import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasValidUploadMagic, validateUploadMetadata } from "../src/lib/uploadValidation";

function main() {
  assert.equal(validateUploadMetadata({ fileName: "safe.pdf", mimeType: "application/pdf", size: 1024 }), null);
  assert.match(validateUploadMetadata({ fileName: "unsafe.svg", mimeType: "image/svg+xml", size: 1024 }) || "", /الصيغ المسموحة/);
  assert.match(validateUploadMetadata({ fileName: "fake.jpg", mimeType: "image/png", size: 1024 }) || "", /امتداد/);
  assert.equal(hasValidUploadMagic(Buffer.from("%PDF-1.7\n"), "application/pdf"), true);
  assert.equal(hasValidUploadMagic(Buffer.from("<script>"), "application/pdf"), false);

  const provider = readFileSync("src/lib/storage/r2.ts", "utf8");
  assert.match(provider, /PutObjectCommand/);
  assert.match(provider, /expiresIn: input\.expiresInSeconds/);
  assert.match(provider, /ContentType: input\.contentType/);
  assert.match(provider, /signableHeaders: new Set\(\["content-type"\]\)/);
  assert.match(provider, /"nashmi-size": String\(input\.sizeBytes\)/);
  assert.doesNotMatch(provider, /NEXT_PUBLIC_R2/);

  const authorize = readFileSync("src/app/api/uploads/authorize/route.ts", "utf8");
  assert.match(authorize, /requireActiveUser/);
  assert.match(authorize, /requireRateLimit/);
  const uploadRoute = readFileSync("src/app/api/uploads/route.ts", "utf8");
  assert.doesNotMatch(uploadRoute, /request\.formData/);
  assert.match(uploadRoute, /getObjectStorage\(\)\.deleteObject/);
  const mediaRoute = readFileSync("src/app/api/media/[id]/route.ts", "utf8");
  assert.match(mediaRoute, /asset\.visibility === "protected"/);
  assert.match(mediaRoute, /isOwner/);
  assert.match(mediaRoute, /createDownloadUrl/);
  console.log("Storage security tests passed.");
}

main();
