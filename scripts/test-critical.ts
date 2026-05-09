import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { storePublicFile } from "../src/lib/storage";
import { buildPartyMatchIndexes, matchPartyByName, normalizeArabicPartyName, normalizePartyLogoRecord } from "../src/lib/partyMatching";
import { snapshotFromPost } from "../src/lib/publisher";
import { hasValidUploadMagic, validateUploadFile, validateUploadMetadata } from "../src/lib/uploadValidation";
import { postCreateSchema } from "../src/lib/validators";

function makeFile(name: string, type: string, size: number) {
  return new File([new Uint8Array(size || 1)], name, { type });
}

async function testPartyMatching() {
  assert.equal(normalizeArabicPartyName("حِزْبُ الإصلاح"), "حزب الاصلاح");
  const parties = [{ name: "حزب الأمة", slug: "ummah" }, { name: "الحزب الديمقراطي الاجتماعي الأردني", slug: "social" }];
  const indexes = buildPartyMatchIndexes(parties);
  assert.equal(matchPartyByName("حزب الامه", indexes)[0]?.slug, "ummah");
  assert.equal(matchPartyByName("الديمقراطي الاجتماعي الاردني", indexes)[0]?.slug, "social");
  assert.deepEqual(normalizePartyLogoRecord({ "اسم_الحزب": "حزب الاختبار", "الرابط": "https://parties.iec.jo/storage/logo.png" }), {
    name: "حزب الاختبار",
    imageUrl: "https://parties.iec.jo/storage/logo.png"
  });
}

async function testUploadValidation() {
  assert.equal(validateUploadFile(makeFile("a.jpg", "image/jpeg", 1024), { imagesOnly: true }), null);
  assert.equal(validateUploadFile(makeFile("a.gif", "image/gif", 1024), { imagesOnly: true }), null);
  assert.equal(validateUploadFile(makeFile("a.mp4", "video/mp4", 1024)), null);
  assert.match(validateUploadFile(makeFile("a.svg", "image/svg+xml", 1024), { imagesOnly: true }) || "", /الصيغ المسموحة/);
  assert.match(validateUploadFile(makeFile("a.jpg", "image/png", 1024), { imagesOnly: true }) || "", /امتداد الملف/);
  assert.equal(validateUploadMetadata({ fileName: "a.mp4", mimeType: "video/mp4", size: 100 * 1024 * 1024 }), null);
  assert.match(validateUploadMetadata({ fileName: "a.mp4", mimeType: "video/mp4", size: 101 * 1024 * 1024 }) || "", /100MB/);

  assert.equal(hasValidUploadMagic(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg"), true);
  assert.equal(hasValidUploadMagic(Buffer.from("not an image"), "image/jpeg"), false);
}

function testPostMediaUrlRejection() {
  assert.throws(
    () => postCreateSchema.parse({ content: "test", mediaUrl: "https://example.com/file.jpg" }),
    /روابط وسائط|Unrecognized key/
  );
}

async function testMissingBlobToken() {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercel = process.env.VERCEL;
  const previousBlob = process.env.BLOB_READ_WRITE_TOKEN;
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "production";
  delete process.env.VERCEL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  await assert.rejects(
    storePublicFile({ buffer: Buffer.from("x"), storageKey: "tests/file.txt", contentType: "text/plain" }),
    /BLOB_STORAGE_NOT_CONFIGURED/
  );
  if (previousNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previousNodeEnv;
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
  if (previousBlob === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = previousBlob;
}

async function testPublisherSnapshot() {
  const partyPost = {
    authorType: "party",
    partyId: { name: "حزب الاختبار", slug: "test-party", logoUrl: "https://parties.iec.jo/storage/logo.png", isVerified: true },
    authorUserId: { name: "ناشر", avatarUrl: null, image: null }
  };
  assert.deepEqual(snapshotFromPost(partyPost), {
    id: null,
    type: "party",
    name: "حزب الاختبار",
    imageUrl: "https://parties.iec.jo/storage/logo.png",
    href: "/parties/test-party",
    badge: "حزب موثق"
  });

  const iecPost = { authorType: "iec", authorUserId: { name: "الهيئة" } };
  assert.equal(snapshotFromPost(iecPost, { name: "الهيئة المستقلة للانتخاب", logoUrl: "/related/iec-logo.png" }).imageUrl, "/related/iec-logo.png");
}

function testLogoAssetReferences() {
  const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf8");
  assert.match(navbar, /\/images\/nashmi logo\.png/);
  assert.doesNotMatch(navbar, /nashmi logo_transparent|nashmi logo_cropped/);
}

async function main() {
  await testPartyMatching();
  await testUploadValidation();
  await testMissingBlobToken();
  await testPublisherSnapshot();
  testLogoAssetReferences();
  testPostMediaUrlRejection();
  console.log("Critical tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
