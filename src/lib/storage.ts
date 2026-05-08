import { mkdir, open } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

type StoredFile = {
  url: string;
  storageKey: string;
  provider: "vercel_blob" | "local_dev";
};

function safeLocalPath(uploadDir: string, storageKey: string) {
  const resolvedDir = path.resolve(uploadDir);
  const resolvedPath = path.resolve(resolvedDir, storageKey);
  if (!resolvedPath.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error("BAD_REQUEST");
  }
  return resolvedPath;
}

export async function storePublicFile(input: { buffer: Buffer; storageKey: string; contentType: string }): Promise<StoredFile> {
  const key = input.storageKey.replace(/^\/+/, "");
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  if (hasBlobToken) {
    const blob = await put(key, input.buffer, {
      access: "public",
      contentType: input.contentType,
      addRandomSuffix: false
    });
    return { url: blob.url, storageKey: key, provider: "vercel_blob" };
  }

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("BLOB_STORAGE_NOT_CONFIGURED");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(path.dirname(safeLocalPath(uploadDir, key)), { recursive: true });
  const fileHandle = await open(safeLocalPath(uploadDir, key), "wx");
  try {
    await fileHandle.writeFile(input.buffer);
  } finally {
    await fileHandle.close();
  }

  return { url: `/uploads/${key}`, storageKey: key, provider: "local_dev" };
}
