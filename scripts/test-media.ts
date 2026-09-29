import assert from "node:assert/strict";
import { S3Client } from "@aws-sdk/client-s3";
import { stableMediaId, stableMediaUrlForAsset } from "../src/lib/mediaIdentity";
import { parseUploadLimits, uploadLimitForMimeType } from "../src/lib/clientUploadLimits";
import { getMaxImageUploadSizeBytes } from "../src/lib/env";
import { normalizeSafeImageUrl, shouldUseNextImageForUrl } from "../src/lib/imageUrls";
import { presignR2Upload } from "../src/lib/storage/presign";
import { hasValidUploadMagic, validateUploadMetadata } from "../src/lib/uploadValidation";

async function main() {
  const previousGenericLimit = process.env.MAX_UPLOAD_SIZE_MB;
  const previousImageLimit = process.env.MAX_IMAGE_UPLOAD_SIZE_MB;
  try {
    process.env.MAX_UPLOAD_SIZE_MB = "3";
    delete process.env.MAX_IMAGE_UPLOAD_SIZE_MB;
    assert.equal(getMaxImageUploadSizeBytes(), 10 * 1024 * 1024);
    assert.equal(validateUploadMetadata({ fileName: "photo.jpg", mimeType: "image/jpeg", size: 10 * 1024 * 1024, imagesOnly: true }), null);
    assert.match(validateUploadMetadata({ fileName: "photo.jpg", mimeType: "image/jpeg", size: 10 * 1024 * 1024 + 1, imagesOnly: true }) || "", /10MB/);
  } finally {
    if (previousGenericLimit === undefined) delete process.env.MAX_UPLOAD_SIZE_MB;
    else process.env.MAX_UPLOAD_SIZE_MB = previousGenericLimit;
    if (previousImageLimit === undefined) delete process.env.MAX_IMAGE_UPLOAD_SIZE_MB;
    else process.env.MAX_IMAGE_UPLOAD_SIZE_MB = previousImageLimit;
  }
  const productionLimits = parseUploadLimits({ data: {
    directR2Upload: true,
    maxImageSizeBytes: 3 * 1024 * 1024,
    maxVideoSizeBytes: 100 * 1024 * 1024,
    maxDocumentSizeBytes: 3 * 1024 * 1024
  } });
  assert.ok(productionLimits);
  assert.equal(uploadLimitForMimeType("image/jpeg", productionLimits), 3 * 1024 * 1024);
  assert.equal(uploadLimitForMimeType("application/pdf", productionLimits), 3 * 1024 * 1024);
  assert.equal(parseUploadLimits({ data: { directR2Upload: false } }), null);
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
  assert.equal(validateUploadMetadata({ fileName: "photo.avif", mimeType: "image/avif", size: 256, imagesOnly: true }), null);
  assert.equal(hasValidUploadMagic(Buffer.from("0000ftypavif0000"), "image/avif"), true);
  assert.equal(hasValidUploadMagic(Buffer.from("0000ftypheic0000"), "image/avif"), false);
  assert.equal(validateUploadMetadata({ fileName: "photo.bmp", mimeType: "image/bmp", size: 256, imagesOnly: true }), null);
  const bmpHeader = Buffer.alloc(64);
  bmpHeader.write("BM", 0, "ascii");
  bmpHeader.writeUInt32LE(70, 2);
  bmpHeader.writeUInt32LE(54, 10);
  bmpHeader.writeUInt32LE(40, 14);
  assert.equal(hasValidUploadMagic(bmpHeader, "image/bmp"), true);
  assert.equal(hasValidUploadMagic(Buffer.from("BMnotanimage"), "image/bmp"), false);
  assert.equal(hasValidUploadMagic(Buffer.from("notanimage"), "image/bmp"), false);

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
