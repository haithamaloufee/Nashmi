const youtubeIdPattern = /^[a-zA-Z0-9_-]{6,20}$/;

export function isValidYoutubeVideoId(id: string | null | undefined) {
  if (!id) return true;
  return youtubeIdPattern.test(id);
}

export function youtubeEmbedUrl(id: string) {
  if (!youtubeIdPattern.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
}
