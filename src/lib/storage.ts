import { mkdir, open } from "fs/promises";
import path from "path";

type StoredFile = {
  url: string;
  storageKey: string;
  provider: "local_dev";
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
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("R2_DIRECT_UPLOAD_REQUIRED");
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
