import { Suspense } from "react";
import Link from "next/link";
import PartyCard from "@/components/parties/PartyCard";
import Alert from "@/components/ui/Alert";
import { getPublicParties, getUpdates } from "@/lib/serverData";
import { PartyCardSkeleton, SkeletonLine } from "@/components/ui/Skeletons";
import { I18nText } from "@/components/i18n/LanguageProvider";
import { SearchSubmitButton, TranslatedSearchInput } from "@/components/i18n/TranslatedFormControls";

export const dynamic = "force-dynamic";

async function LatestPartyUpdates() {
  const latest = (await getUpdates(undefined, "all")) as any[];
  return (
    <section className="mb-8 grid gap-3 md:grid-cols-3">
      {latest.slice(0, 3).map((item) => (
        <Link key={`${item.type}-${item.item._id}`} href="/updates" className="card card-hover p-4 text-sm">
          <span className="text-civic"><I18nText id={item.type === "post" ? "content.post" : item.type === "poll" ? "content.poll" : "content.survey"} /></span>
          <p className="mt-2 line-clamp-2">{item.type === "post" ? item.item.title || item.item.content : item.type === "poll" ? item.item.question : item.item.title}</p>
        </Link>
      ))}
    </section>
  );
}

function LatestPartyUpdatesSkeleton() {
  return (
    <section className="mb-8 grid gap-3 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="card p-4">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="mt-3 h-4 w-full" />
          <SkeletonLine className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </section>
  );
}

async function PartiesGrid({ search }: { search?: string }) {
  const parties = (await getPublicParties(search)) as any[];
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {parties.map((party) => <PartyCard key={party._id} party={party} />)}
    </section>
  );
}

function PartiesGridSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => <PartyCardSkeleton key={item} />)}
    </section>
  );
}

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black"><I18nText id="party.portal.title" /></h1>
          <p className="mt-2 text-ink/70"><I18nText id="party.portal.subtitle" /></p>
        </div>
        <form className="flex gap-2">
          <TranslatedSearchInput defaultValue={params.search || ""} placeholderKey="party.portal.search" />
          <SearchSubmitButton />
        </form>
      </div>
      <div className="mb-6">
        <Alert><I18nText id="party.portal.info" /></Alert>
      </div>
      <Suspense fallback={<LatestPartyUpdatesSkeleton />}>
        <LatestPartyUpdates />
      </Suspense>
      <Suspense fallback={<PartiesGridSkeleton />}>
        <PartiesGrid search={params.search} />
      </Suspense>
    </main>
  );
}
