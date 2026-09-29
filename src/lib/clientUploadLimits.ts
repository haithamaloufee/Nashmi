export type UploadLimits = {
  image: number;
  video: number;
  document: number;
};

export function parseUploadLimits(value: unknown): UploadLimits | null {
  if (!value || typeof value !== "object") return null;
  const data = (value as { data?: Record<string, unknown> }).data;
  if (!data || typeof data !== "object" || data.directR2Upload !== true) return null;
  const image = data.maxImageSizeBytes;
  const video = data.maxVideoSizeBytes;
  const document = data.maxDocumentSizeBytes;
  if (![image, video, document].every((limit) => typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0)) return null;
  return { image: image as number, video: video as number, document: document as number };
}

export function uploadLimitForMimeType(mimeType: string, limits: UploadLimits) {
  if (mimeType.startsWith("video/")) return limits.video;
  if (mimeType === "application/pdf") return limits.document;
  return limits.image;
}
