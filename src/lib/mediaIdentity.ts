import { isValidObjectId } from "mongoose";

export function stableMediaUrlForAsset(assetId: string) {
  if (!isValidObjectId(assetId)) throw new Error("BAD_REQUEST");
  return `/api/media/${assetId}`;
}

export function stableMediaId(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/api/media/")) return undefined;
  const id = value.slice("/api/media/".length);
  if (!isValidObjectId(id) || id.includes("/")) throw new Error("BAD_REQUEST");
  return id;
}
