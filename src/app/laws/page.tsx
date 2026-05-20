import { Suspense } from "react";
import LawCard from "@/components/laws/LawCard";
import LawManagementControls from "@/components/laws/LawManagementControls";
import LawsFilterForm from "@/components/laws/LawsFilterForm";
import Alert from "@/components/ui/Alert";
import { getCurrentUser } from "@/lib/auth";
import { canManageLaws } from "@/lib/permissions";
import { getPublicLaws } from "@/lib/serverData";
import { SkeletonLine } from "@/components/ui/Skeletons";
import { I18nText } from "@/components/i18n/LanguageProvider";

export const dynamic = "force-dynamic";

function LawsContentSkeleton() {
  return (
    <>
      <div className="my-6 flex flex-wrap gap-2">
        <SkeletonLine className="h-11 w-72" />
        <SkeletonLine className="h-11 w-44" />
        <SkeletonLine className="h-11 w-12" />
      </div>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="card p-5">
            <SkeletonLine className="h-5 w-36" />
            <SkeletonLine className="mt-4 h-3 w-full" />
            <SkeletonLine className="mt-2 h-3 w-5/6" />
            <SkeletonLine className="mt-5 h-9 w-28" />
          </div>
        ))}
      </section>
    </>
  );
}

async function LawsContent({ search, category }: { search?: string; category?: string }) {
  const data = await getPublicLaws(search, category);
  return (
    <>
      <LawsFilterForm search={search} category={category} categories={data.categories} />
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data.laws as any[]).map((law) => <LawCard key={law._id} law={law} />)}
      </section>
    </>
  );
}

export default async function LawsPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canManage = canManageLaws(user?.role);
  return (
    <main className="container-page py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-black"><I18nText id="laws.title" /></h1>
          <p className="mt-2 text-ink/70"><I18nText id="laws.subtitle" /></p>
        </div>
        {canManage ? <LawManagementControls mode="create" /> : null}
      </div>
      <div className="mt-5">
        <Alert><I18nText id="laws.notice" /></Alert>
      </div>
      <Suspense fallback={<LawsContentSkeleton />}>
        <LawsContent search={params.search} category={params.category} />
      </Suspense>
    </main>
  );
}
