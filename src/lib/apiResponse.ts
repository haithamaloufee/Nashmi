import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InvalidEnvError, MissingEnvError } from "./env";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR";

const messages: Record<ApiErrorCode, string> = {
  BAD_REQUEST: "طلب غير صالح",
  UNAUTHORIZED: "يرجى تسجيل الدخول",
  FORBIDDEN: "غير مصرح",
  NOT_FOUND: "العنصر غير موجود",
  CONFLICT: "يوجد تعارض في البيانات",
  RATE_LIMITED: "تم تجاوز الحد المسموح، حاول لاحقا",
  VALIDATION_ERROR: "البيانات المدخلة غير صحيحة",
  SERVER_ERROR: "حدث خطأ غير متوقع"
};

export function ok<T>(data: T, init?: { status?: number; nextCursor?: string | null }) {
  return NextResponse.json({ ok: true, data, nextCursor: init?.nextCursor ?? null }, { status: init?.status || 200 });
}

export function fail(code: ApiErrorCode, message?: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message: message || messages[code] } }, { status });
}

function safeErrorLog(error: unknown) {
  if (!(error instanceof Error)) {
    console.error({ name: "UnknownError" });
    return;
  }

  console.error({
    name: error.name,
    message: error.message.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<credentials>@")
  });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", error.issues[0]?.message || messages.VALIDATION_ERROR, 422);
  }

  if (error instanceof Error && error.name === "DangerousKeyError") {
    return fail("BAD_REQUEST", "تم رفض مفاتيح غير آمنة في الطلب", 400);
  }

  if (error instanceof Error && error.name === "CastError") {
    return fail("BAD_REQUEST", "معرّف غير صالح", 400);
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("UNAUTHORIZED", undefined, 401);
  if (error instanceof Error && error.message === "FORBIDDEN") return fail("FORBIDDEN", undefined, 403);
  if (error instanceof Error && error.message === "NOT_FOUND") return fail("NOT_FOUND", undefined, 404);
  if (error instanceof Error && error.message === "RATE_LIMITED") return fail("RATE_LIMITED", undefined, 429);
  if (error instanceof MissingEnvError) return fail("SERVER_ERROR", `Server configuration is missing: ${error.variableName}`, 500);
  if (error instanceof InvalidEnvError) return fail("SERVER_ERROR", `Server configuration is invalid: ${error.variableName}`, 500);

  safeErrorLog(error);
  return fail("SERVER_ERROR", undefined, 500);
}
