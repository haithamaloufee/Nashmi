export type StorageVisibility = "public" | "protected";

export type UploadAuthorization = {
  provider: "cloudflare_r2";
  bucket: string;
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};

export type ObjectMetadata = {
  exists: boolean;
  contentLength: number | null;
  contentType: string | null;
  etag: string | null;
  sha256: string | null;
};

export interface ObjectStorageProvider {
  createUploadAuthorization(input: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    expiresInSeconds: number;
    sha256?: string | null;
  }): Promise<UploadAuthorization>;
  getObjectMetadata(storageKey: string): Promise<ObjectMetadata>;
  readObjectPrefix(storageKey: string, maximumBytes: number): Promise<Buffer | null>;
  createDownloadUrl(storageKey: string, expiresInSeconds: number, downloadFileName?: string | null): Promise<string>;
  getPublicUrl(storageKey: string): string | null;
  deleteObject(storageKey: string): Promise<void>;
}
