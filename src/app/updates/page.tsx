import UpdatesClient from "@/components/updates/UpdatesClient";
import { I18nText } from "@/components/i18n/LanguageProvider";
import { getUpdates } from "@/lib/serverData";

export const revalidate = 30;

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ search?: string; filter?: string }> }) {
  const params = await searchParams;
  const initialUpdates = ((await getUpdates(params.search || "", params.filter || "all")) as any[]).slice(0, 10);
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-black"><I18nText id="updates.title" /></h1>
      <p className="mt-2 text-ink/70"><I18nText id="updates.subtitle" /></p>
      <UpdatesClient initialSearch={params.search || ""} initialFilter={params.filter || "all"} initialUpdates={initialUpdates} />
    </main>
  );
}
