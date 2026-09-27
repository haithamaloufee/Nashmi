import { validateVercelBlobUrl } from "@/lib/remoteFetch";

export function validatedLegacyBlobUrl(value: string) {
  let path: string;
  try {
    path = decodeURIComponent(new URL(value).pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("UNTRUSTED_REMOTE_URL");
  }
  return validateVercelBlobUrl(value, path);
}
