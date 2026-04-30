import { Suspense } from "react";
import { Search } from "lucide-react";
import LawCard from "@/components/laws/LawCard";
import Alert from "@/components/ui/Alert";
import { getPublicLaws } from "@/lib/serverData";
import { SkeletonLine } from "@/components/ui/Skeletons";

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
      <form className="my-6 flex flex-wrap gap-2">
        <input name="search" defaultValue={search || ""} className="w-72 rounded border-line focus:border-civic focus:ring-civic" placeholder="ابحث عن قانون أو مفهوم" />
        <select name="category" defaultValue={category || ""} className="rounded border-line focus:border-civic focus:ring-civic">
          <option value="">كل التصنيفات</option>
          {data.categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="rounded bg-civic px-4 py-2 text-white hover:bg-civic/90"><Search className="h-4 w-4" /></button>
      </form>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data.laws as any[]).map((law) => <LawCard key={law._id} law={law} />)}
      </section>
    </>
  );
}

export default async function LawsPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string }> }) {
  const params = await searchParams;
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-black">افهم قانونك</h1>
      <p className="mt-2 text-ink/70">شرح مبسط للقوانين والمفاهيم الانتخابية من مصادر منشورة.</p>
      <div className="mt-5">
        <Alert>شرح القوانين للتوعية العامة وليس استشارة قانونية رسمية.</Alert>
      </div>
      <Suspense fallback={<LawsContentSkeleton />}>
        <LawsContent search={params.search} category={params.category} />
      </Suspense>
    </main>
  );
}
