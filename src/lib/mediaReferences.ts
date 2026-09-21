import "server-only";
import { isValidObjectId } from "mongoose";
import MediaAsset from "@/models/MediaAsset";

export function stableMediaId(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/api/media/")) return undefined;
  const id = value.slice("/api/media/".length);
  if (!isValidObjectId(id) || id.includes("/")) throw new Error("BAD_REQUEST");
  return id;
}

export async function resolveOwnedReadyMediaId(input: {
  url: unknown;
  ownerUserId: string;
  purposes: string[];
}) {
  const id = stableMediaId(input.url);
  if (!id) return undefined;
  const asset = await MediaAsset.findOne({
    _id: id,
    ownerUserId: input.ownerUserId,
    purpose: { $in: input.purposes },
    status: { $in: ["ready", "active"] }
  }).select("_id").lean();
  if (!asset) throw new Error("FORBIDDEN");
  return asset._id;
}
