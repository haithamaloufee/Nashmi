type NormalizeImageUrlOptions = {
  localPrefixes?: string[];
  allowHttp?: boolean;
};

const defaultLocalPrefixes = ["/images/"];

function hasPathTraversal(value: string) {
  try {
    return decodeURIComponent(value).includes("..");
  } catch {
    return value.includes("..");
  }
}

export function normalizeSafeImageUrl(value: unknown, options: NormalizeImageUrlOptions = {}) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  if (hasPathTraversal(trimmed)) return null;

  const localPrefixes = options.localPrefixes || defaultLocalPrefixes;
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) return null;
    if (hasPathTraversal(trimmed)) return null;
    return localPrefixes.some((prefix) => trimmed.startsWith(prefix)) ? trimmed : null;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const allowHttp = options.allowHttp ?? true;
    if (protocol !== "https:" && !(allowHttp && protocol === "http:")) return null;
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    if (hasPathTraversal(parsed.pathname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSafeImageUrl(value: unknown, options?: NormalizeImageUrlOptions) {
  return normalizeSafeImageUrl(value, options) !== null;
}
