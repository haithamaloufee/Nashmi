import UpdatesClient from "@/components/updates/UpdatesClient";
import { I18nText } from "@/components/i18n/LanguageProvider";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { getCurrentUser } from "@/lib/auth";
import { contentCreatorRoles, canMutateStatus } from "@/lib/permissions";
import { getAuthorityAuthor } from "@/lib/publisher";
import { getPartyForUser } from "@/lib/routeUtils";
import { getUpdates } from "@/lib/serverData";

export const dynamic = "force-dynamic";

async function getUpdatesPublisher(): Promise<PublisherComposerProfile | null> {
  try {
    const user = await getCurrentUser();
    if (!user || !contentCreatorRoles.includes(user.role) || !canMutateStatus(user.status)) return null;

    if (user.role === "party") {
      const party = await getPartyForUser(user.id);
      if (!party) return null;
      return {
        name: party.name,
        imageUrl: party.logoUrl || user.avatarUrl || user.image || null,
        accountType: "party"
      };
    }

    if (user.role === "iec") {
      const authorityAuthor = await getAuthorityAuthor();
      return {
        name: authorityAuthor.name,
        imageUrl: authorityAuthor.logoUrl || user.avatarUrl || user.image || null,
        accountType: "authority"
      };
    }

    return {
      name: user.name,
      imageUrl: user.avatarUrl || user.image || null,
      accountType: "admin"
    };
  } catch {
    return null;
  }
}

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ search?: string; filter?: string }> }) {
  const params = await searchParams;
  const [initialUpdates, publisher] = await Promise.all([
    getUpdates(params.search || "", params.filter || "all"),
    getUpdatesPublisher()
  ]);
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-black"><I18nText id="updates.title" /></h1>
      <p className="mt-2 text-ink/70"><I18nText id="updates.subtitle" /></p>
      <UpdatesClient initialSearch={params.search || ""} initialFilter={params.filter || "all"} initialUpdates={(initialUpdates as any[]).slice(0, 10)} publisher={publisher} />
    </main>
  );
}
