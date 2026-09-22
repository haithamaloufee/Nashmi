import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getR2AccessKeyId,
  getR2BucketName,
  getR2Endpoint,
  getR2PublicBaseUrl,
  getR2SecretAccessKey
} from "@/lib/env";
import type { ObjectMetadata, ObjectStorageProvider, UploadAuthorization } from "@/lib/storage/types";

let cachedClient: S3Client | null = null;
let cachedFingerprint = "";

function cleanStorageKey(storageKey: string) {
  const key = storageKey.replace(/^\/+/, "");
  if (!key || key.includes("..") || key.includes("\\") || key.length > 1024) throw new Error("INVALID_STORAGE_KEY");
  return key;
}

export function getR2Client() {
  const endpoint = getR2Endpoint();
  const accessKeyId = getR2AccessKeyId();
  const secretAccessKey = getR2SecretAccessKey();
  const fingerprint = `${endpoint}:${accessKeyId}`;
  if (!cachedClient || cachedFingerprint !== fingerprint) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true
    });
    cachedFingerprint = fingerprint;
  }
  return cachedClient;
}

async function bodyToBuffer(body: unknown, maximumBytes: number) {
  if (!body || typeof body !== "object" || !(Symbol.asyncIterator in body)) return null;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > maximumBytes) return null;
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}

export class R2StorageProvider implements ObjectStorageProvider {
  private get bucket() {
    return getR2BucketName();
  }

  async createUploadAuthorization(input: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    expiresInSeconds: number;
    sha256?: string | null;
  }): Promise<UploadAuthorization> {
    const storageKey = cleanStorageKey(input.storageKey);
    const metadata: Record<string, string> = {
      "nashmi-size": String(input.sizeBytes)
    };
    if (input.sha256 && /^[a-f0-9]{64}$/i.test(input.sha256)) metadata["nashmi-sha256"] = input.sha256.toLowerCase();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
      Metadata: metadata
    });
    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: input.expiresInSeconds,
      signableHeaders: new Set(["content-type"])
    });
    return {
      provider: "cloudflare_r2",
      bucket: this.bucket,
      storageKey,
      uploadUrl,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      requiredHeaders: { "Content-Type": input.contentType }
    };
  }

  async getObjectMetadata(storageKey: string): Promise<ObjectMetadata> {
    try {
      const result = await getR2Client().send(new HeadObjectCommand({ Bucket: this.bucket, Key: cleanStorageKey(storageKey) }));
      return {
        exists: true,
        contentLength: typeof result.ContentLength === "number" ? result.ContentLength : null,
        contentType: result.ContentType?.split(";", 1)[0]?.trim().toLowerCase() || null,
        etag: result.ETag?.replace(/^"|"$/g, "") || null,
        sha256: result.Metadata?.["nashmi-sha256"] || null
      };
    } catch (error) {
      const status = typeof error === "object" && error !== null && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
      if (status === 404) return { exists: false, contentLength: null, contentType: null, etag: null, sha256: null };
      throw error;
    }
  }

  async readObjectPrefix(storageKey: string, maximumBytes: number) {
    const result = await getR2Client().send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: cleanStorageKey(storageKey),
      Range: `bytes=0-${Math.max(0, maximumBytes - 1)}`
    }));
    return bodyToBuffer(result.Body, maximumBytes);
  }

  async createDownloadUrl(storageKey: string, expiresInSeconds: number, downloadFileName?: string | null) {
    const responseContentDisposition = downloadFileName
      ? `attachment; filename*=UTF-8''${encodeURIComponent(downloadFileName.replace(/[\r\n]/g, ""))}`
      : undefined;
    return getSignedUrl(
      getR2Client(),
      new GetObjectCommand({ Bucket: this.bucket, Key: cleanStorageKey(storageKey), ResponseContentDisposition: responseContentDisposition }),
      { expiresIn: expiresInSeconds }
    );
  }

  getPublicUrl(storageKey: string) {
    const baseUrl = getR2PublicBaseUrl();
    return baseUrl ? `${baseUrl}/${cleanStorageKey(storageKey).split("/").map(encodeURIComponent).join("/")}` : null;
  }

  async deleteObject(storageKey: string) {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: cleanStorageKey(storageKey) }));
  }
}

export const r2Storage = new R2StorageProvider();
