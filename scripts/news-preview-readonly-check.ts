import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { verifyNewsPreviewIsolation } from "../src/lib/news/previewIsolation";

async function main() {
  const configuration = parse(readFileSync(".env.preview.local"));
  if (!configuration.MONGODB_URI) throw new Error("PREVIEW_URI_REQUIRED_IN_LOCAL_FILE");
  process.env.MONGODB_URI = configuration.MONGODB_URI;
  process.env.VERCEL_ENV = "preview";
  const result = await verifyNewsPreviewIsolation();
  console.log(JSON.stringify({ ...result, readOnly: true }));
}

main().catch((error) => {
  // Driver errors can contain connection details; never emit their message.
  console.error(error instanceof Error ? error.name : "PREVIEW_READONLY_CHECK_FAILED");
  process.exit(1);
});
