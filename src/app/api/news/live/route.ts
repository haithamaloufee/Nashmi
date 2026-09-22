import { ok, handleApiError } from "@/lib/apiResponse";
import { getActiveNewsItems } from "@/lib/news/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getActiveNewsItems(15);
    return ok({ items }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    return handleApiError(error);
  }
}
