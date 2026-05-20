import { ok, handleApiError } from "@/lib/apiResponse";
import { getHashtagResults } from "@/lib/serverData";
import { normalizeHashtag } from "@/lib/localization";

export async function GET(_request: Request, { params }: { params: Promise<{ tag: string }> }) {
  try {
    const { tag } = await params;
    const data = await getHashtagResults(normalizeHashtag(decodeURIComponent(tag || "")));
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
