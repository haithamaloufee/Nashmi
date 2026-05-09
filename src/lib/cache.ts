export const CACHE_HEADERS = {
  publicFeed: "public, s-maxage=30, stale-while-revalidate=60",
  publicComments: "public, s-maxage=30, stale-while-revalidate=60",
  publicProfile: "public, s-maxage=120, stale-while-revalidate=300",
  publicMetadata: "public, s-maxage=3600, stale-while-revalidate=86400",
  privateNoStore: "private, no-store, max-age=0"
} as const;

export function cacheHeaders(value: string) {
  return { "Cache-Control": value };
}
