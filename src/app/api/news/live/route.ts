import { ok, handleApiError } from "@/lib/apiResponse";
import { getActiveNewsItems } from "@/lib/news/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getActiveNewsItems(20);
    return ok({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
