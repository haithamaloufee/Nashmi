import { ok, handleApiError } from "@/lib/apiResponse";
import { getActiveNewsItems } from "@/lib/news/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getActiveNewsItems(10);
    return ok({ items }, { headers: { "Cache-Control": "public, s-maxage=20, max-age=0, must-revalidate" } });
  } catch (error) {
    return handleApiError(error);
  }
}
