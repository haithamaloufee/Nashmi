const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

export function requestIdFrom(request?: Request | null) {
  const candidate = request?.headers.get("x-request-id")?.trim();
  return candidate && SAFE_REQUEST_ID.test(candidate) ? candidate : null;
}

function safeErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function safeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  return error.message
    .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<credentials>@")
    .replace(/(token|password|secret|api[_-]?key)=([^&\s]+)/gi, "$1=<redacted>")
    .slice(0, 500);
}

export function logServerError(error: unknown, context: { request?: Request; route?: string; category?: string } = {}) {
  console.error({
    level: "error",
    event: context.category || "server.error",
    requestId: requestIdFrom(context.request) || undefined,
    route: context.route,
    errorName: safeErrorName(error),
    errorMessage: safeErrorMessage(error)
  });
}
