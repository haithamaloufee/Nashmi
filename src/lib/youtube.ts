const youtubeIdPattern = /^[a-zA-Z0-9_-]{6,20}$/;

export function isValidYoutubeVideoId(id: string | null | undefined) {
  if (!id) return true;
  return youtubeIdPattern.test(id);
}

export function extractYoutubeVideoId(value: string | null | undefined) {
  const input = (value || "").trim();
  if (!input) return null;
  if (youtubeIdPattern.test(input)) return input;

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return youtubeIdPattern.test(id || "") ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const watchId = url.searchParams.get("v");
      if (youtubeIdPattern.test(watchId || "")) return watchId;
      const parts = url.pathname.split("/").filter(Boolean);
      const markerIndex = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
      const id = markerIndex >= 0 ? parts[markerIndex + 1] : null;
      return youtubeIdPattern.test(id || "") ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeYoutubeInput(value: string | null | undefined) {
  const id = extractYoutubeVideoId(value);
  return id ? { id, url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` } : null;
}

export function youtubeThumbnailUrl(id: string) {
  if (!youtubeIdPattern.test(id)) return null;
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(id: string) {
  if (!youtubeIdPattern.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
}
