export type ConversationItem = { role: "user" | "assistant"; content: string };

export function buildBoundedConversation(history: ConversationItem[], latestMessage: string, maxChars: number) {
  const latest = latestMessage.trim().slice(0, Math.min(4_000, maxChars));
  const selected: ConversationItem[] = [];
  let remaining = Math.max(0, maxChars - latest.length);

  for (let index = history.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const item = history[index];
    const clean = item.content.replace(/\s+/g, " ").trim();
    if (!clean || (item.role === "user" && clean === latest)) continue;
    const content = clean.slice(-Math.min(2_400, remaining));
    selected.unshift({ role: item.role, content });
    remaining -= content.length;
  }

  while (selected[0]?.role === "assistant") selected.shift();
  selected.push({ role: "user", content: latest });
  return selected;
}

export function classifyAiProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: number }).status) : null;
  if (message.includes("GEMINI_API_KEY")) return { code: "missing_key" as const, retryable: false };
  if (status === 401 || status === 403 || /api key|permission|unauthorized|forbidden/i.test(message)) return { code: "auth" as const, retryable: false };
  if (status === 429 || /quota|rate/i.test(message)) return { code: "rate_limit" as const, retryable: true };
  if (status === 404 || /not found|model|unavailable/i.test(message)) return { code: "model_unavailable" as const, retryable: true };
  if (/timeout|timed out|abort/i.test(message)) return { code: "timeout" as const, retryable: true };
  if (/safety|blocked/i.test(message)) return { code: "safety" as const, retryable: false };
  return { code: "unknown" as const, retryable: false };
}
