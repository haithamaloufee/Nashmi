import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { CACHE_HEADERS, cacheHeaders } from "@/lib/cache";
import { getPublicUserProfile } from "@/lib/publicUser";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const result = await getPublicUserProfile(id);
    if (result.status === 400) return fail("BAD_REQUEST", "معرّف المستخدم غير صالح", 400);
    if (result.status === 404 || !result.user) return fail("NOT_FOUND", "المستخدم غير موجود", 404);
    return ok({ user: result.user }, { headers: cacheHeaders(CACHE_HEADERS.publicProfile) });
  } catch (error) {
    return handleApiError(error);
  }
}
