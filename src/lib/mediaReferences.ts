import "server-only";
import { stableMediaId } from "@/lib/mediaIdentity";
import MediaAsset from "@/models/MediaAsset";

export { stableMediaId } from "@/lib/mediaIdentity";

export async function resolveOwnedReadyMediaId(input: {
  url: unknown;
  ownerUserId: string;
  purposes: string[];
  requireMatch?: boolean;
}) {
  const id = stableMediaId(input.url);
  const asset = await MediaAsset.findOne({
    ...(id ? { _id: id } : { url: input.url }),
    ownerUserId: input.ownerUserId,
    purpose: { $in: input.purposes },
    status: { $in: ["ready", "active"] }
  }).select("_id").lean();
  if (!asset && (id || input.requireMatch)) throw new Error("FORBIDDEN");
  if (!asset) return undefined;
  return asset._id;
}
