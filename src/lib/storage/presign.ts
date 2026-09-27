import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function presignR2Upload(client: S3Client, input: {
  bucket: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds: number;
  sha256?: string | null;
}) {
  const metadata: Record<string, string> = { "nashmi-size": String(input.sizeBytes) };
  if (input.sha256 && /^[a-f0-9]{64}$/i.test(input.sha256)) metadata["nashmi-sha256"] = input.sha256.toLowerCase();
  const command = new PutObjectCommand({
    Bucket: input.bucket,
    Key: input.storageKey,
    ContentType: input.contentType,
    ContentLength: input.sizeBytes,
    Metadata: metadata
  });
  return getSignedUrl(client, command, {
    expiresIn: input.expiresInSeconds,
    signableHeaders: new Set(["content-type"])
  });
}
