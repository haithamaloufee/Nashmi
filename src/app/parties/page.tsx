import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import PartyCard from "@/components/parties/PartyCard";
import Alert from "@/components/ui/Alert";
import { getPublicParties, getUpdates } from "@/lib/serverData";
import { PartyCardSkeleton, SkeletonLine } from "@/components/ui/Skeletons";

export const dynamic = "force-dynamic";

async function LatestPartyUpdates() {
  const latest = (await getUpdates(undefined, "all")) as any[];
  return (
    <section className="mb-8 grid gap-3 md:grid-cols-3">
      {latest.slice(0, 3).map((item) => (
        <Link key={`${item.type}-${item.item._id}`} href="/updates" className="card card-hover p-4 text-sm">
          <span className="text-civic">{item.type === "post" ? "منشور" : "تصويت"}</span>
          <p className="mt-2 line-clamp-2">{item.type === "post" ? item.item.title || item.item.content : item.item.question}</p>
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
          <h1 className="text-3xl font-black">بوابة الأحزاب</h1>
          <p className="mt-2 text-ink/70">عرض محايد للأحزاب النشطة بترتيب ثابت غير مبني على الشعبية.</p>
        </div>
        <form className="flex gap-2">
          <input name="search" defaultValue={params.search || ""} className="w-64 rounded border-line focus:border-civic focus:ring-civic" placeholder="ابحث باسم الحزب أو وصفه" />
          <button className="rounded bg-civic px-4 py-2 text-white hover:bg-civic/90">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>
      <div className="mb-6">
        <Alert>آخر المستجدات تظهر هنا كبداية للبوابة، مع الحفاظ على عدم ترتيب الأحزاب حسب التفاعل أو الشعبية.</Alert>
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
