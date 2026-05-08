import UpdatesClient from "@/components/updates/UpdatesClient";
import { getUpdates } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ search?: string; filter?: string }> }) {
  const params = await searchParams;
  const initialUpdates = ((await getUpdates(params.search || "", params.filter || "all")) as any[]).slice(0, 10);
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-black">آخر المستجدات</h1>
      <p className="mt-2 text-ink/70">تغذية سريعة للمنشورات والتصويتات العامة من الأحزاب والهيئة.</p>
      <UpdatesClient initialSearch={params.search || ""} initialFilter={params.filter || "all"} initialUpdates={initialUpdates} />
    </main>
  );
}
