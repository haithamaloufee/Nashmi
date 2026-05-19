import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { aboutNashmiSchema } from "@/lib/validators";
import { normalizeYoutubeInput } from "@/lib/youtube";
import { aboutNashmiKey } from "@/lib/siteContent";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import SiteContent from "@/models/SiteContent";

export async function PUT(request: Request) {
  try {
    const user = await requireActiveUser(["admin", "super_admin"]);
    const input = await readJson(request, aboutNashmiSchema);
    await connectToDatabase();

    const normalizedYoutube = normalizeYoutubeInput(input.youtubeUrl);
    const content = await SiteContent.findOneAndUpdate(
      { key: aboutNashmiKey },
      {
        $set: {
          key: aboutNashmiKey,
          titleAr: input.titleAr,
          titleEn: input.titleEn,
          bodyAr: input.bodyAr,
          bodyEn: input.bodyEn,
          youtubeUrl: normalizedYoutube?.url || null,
          youtubeVideoId: normalizedYoutube?.id || null,
          updatedBy: user.id
        }
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "site_content.update", targetType: "site_content", targetId: content?._id, metadata: { key: aboutNashmiKey }, request });
    revalidatePath("/about-nashmi");
    revalidatePath("/admin/about-nashmi");
    return ok({ content: serialize(content) });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = PUT;
