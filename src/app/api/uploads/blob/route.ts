import { fail } from "@/lib/apiResponse";

export const runtime = "nodejs";

export async function GET() {
  return fail("NOT_FOUND", undefined, 404);
}

export async function POST() {
  return fail("BAD_REQUEST", "استخدم مسار التفويض للرفع المباشر إلى R2.", 410);
}
