import assert from "node:assert/strict";
import { S3Client } from "@aws-sdk/client-s3";
import { stableMediaId, stableMediaUrlForAsset } from "../src/lib/mediaIdentity";
import { normalizeSafeImageUrl, shouldUseNextImageForUrl } from "../src/lib/imageUrls";
import { presignR2Upload } from "../src/lib/storage/presign";
import { hasValidUploadMagic, validateUploadMetadata } from "../src/lib/uploadValidation";

async function main() {
  const assetId = "507f1f77bcf86cd799439011";
  const stableUrl = stableMediaUrlForAsset(assetId);
  assert.equal(stableUrl, `/api/media/${assetId}`);
  assert.equal(stableMediaId(stableUrl), assetId);
  assert.equal(normalizeSafeImageUrl(stableUrl), stableUrl);
  assert.equal(shouldUseNextImageForUrl(stableUrl), true);
  assert.equal(shouldUseNextImageForUrl("https://parties.iec.jo/storage/legacy.jpg"), false);
  assert.equal(shouldUseNextImageForUrl("https://example.test/legacy.jpg"), false);
  assert.throws(() => stableMediaId(`${stableUrl}/extra`), /BAD_REQUEST/);
  assert.equal(stableMediaId("https://example.test/old.jpg"), undefined);

  assert.equal(validateUploadMetadata({ fileName: "logo.png", mimeType: "image/png", size: 256, imagesOnly: true }), null);
  assert.equal(hasValidUploadMagic(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(hasValidUploadMagic(Buffer.from("not an image"), "image/png"), false);

  const client = new S3Client({
    region: "auto",
    endpoint: "https://example.r2.cloudflarestorage.com",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    forcePathStyle: true
  });
  const url = new URL(await presignR2Upload(client, {
    bucket: "test-bucket",
    storageKey: `preview/parties/user/${assetId}.png`,
    contentType: "image/png",
    sizeBytes: 256,
    expiresInSeconds: 300
  }));
  assert.equal(url.protocol, "https:");
  assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "content-length;content-type;host");
  assert.equal(url.searchParams.get("x-amz-meta-nashmi-size"), "256");
  assert.ok(url.searchParams.has("X-Amz-Signature"));
  console.log("Media identity and R2 signing tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
