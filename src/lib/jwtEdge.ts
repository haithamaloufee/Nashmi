type EdgeAuthPayload = { userId: string; role?: string; sessionVersion: number };

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
}

export async function verifyEdgeAuthToken(token: string): Promise<EdgeAuthPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { alg?: unknown; typ?: unknown };
    if (header.alg !== "HS256" || (header.typ !== undefined && header.typ !== "JWT")) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    if (payload.nbf !== undefined && (typeof payload.nbf !== "number" || payload.nbf > now)) return null;
    return {
      userId: payload.sub,
      role: typeof payload.role === "string" ? payload.role : undefined,
      sessionVersion: typeof payload.sv === "number" ? Math.max(0, payload.sv) : 0
    };
  } catch {
    return null;
  }
}
