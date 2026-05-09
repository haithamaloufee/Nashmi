type UnknownMediaAsset = {
  _id?: unknown;
  url?: unknown;
  type?: unknown;
  mimeType?: unknown;
  width?: unknown;
  height?: unknown;
  status?: unknown;
  purpose?: unknown;
  provider?: unknown;
};

type PublicMediaSource = "user-upload" | "party-default" | "authority-default" | "fallback";

export type PublicMediaAsset = {
  id?: string;
  url: string;
  type: "image" | "video" | "document";
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  status?: string | null;
  source: PublicMediaSource;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalizeMediaType(value: unknown): "image" | "video" | "document" {
  if (value === "video" || value === "image" || value === "document") return value;
  if (isString(value)) {
    if (value.startsWith("video")) return "video";
    if (value.startsWith("image")) return "image";
    if (value === "document") return "document";
  }
  return "image";
}

function resolveMediaSource(purpose: unknown, provider: unknown): PublicMediaSource {
  if (purpose === "authority_logo" || purpose === "authority_cover") return "authority-default";
  if (purpose === "party_logo" || purpose === "party_cover") return "party-default";
  if (purpose === "post" || purpose === "avatar" || purpose === "law_thumbnail" || purpose === "misc") return "user-upload";
  return provider === "local_dev" ? "fallback" : "user-upload";
}

export function normalizeMediaAsset(asset: unknown): PublicMediaAsset | null {
  if (!asset || typeof asset !== "object") return null;

  const mediaAsset = asset as UnknownMediaAsset;

  const rawUrl = mediaAsset.url;
  if (!isString(rawUrl) || !rawUrl.trim()) return null;

  const rawId = mediaAsset._id;
  const rawMimeType = mediaAsset.mimeType;
  const rawWidth = mediaAsset.width;
  const rawHeight = mediaAsset.height;
  const rawStatus = mediaAsset.status;
  const rawType = mediaAsset.type;
  const rawPurpose = mediaAsset.purpose;
  const rawProvider = mediaAsset.provider;

  return {
    id: rawId ? String(rawId) : undefined,
    url: rawUrl.trim(),
    type: normalizeMediaType(rawType),
    mimeType: isString(rawMimeType) ? rawMimeType : undefined,
    width: typeof rawWidth === "number" ? rawWidth : null,
    height: typeof rawHeight === "number" ? rawHeight : null,
    status: isString(rawStatus) ? rawStatus : null,
    source: resolveMediaSource(rawPurpose, rawProvider)
  };
}

export function normalizeMediaAssets(value: unknown): PublicMediaAsset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((asset) => normalizeMediaAsset(asset))
    .filter((asset): asset is PublicMediaAsset => asset !== null);
}

export function normalizePopulatedMedia<T extends Record<string, unknown>>(item: T): T {
  if (Array.isArray(item.mediaIds)) {
    return { ...item, mediaIds: normalizeMediaAssets(item.mediaIds) } as T;
  }
  return item;
}

export function normalizePopulatedMediaItems<T extends Record<string, unknown>>(items: T[]): T[] {
  return items.map(normalizePopulatedMedia);
}
