import Link from "next/link";
import { Search } from "lucide-react";
import PartyCard from "@/components/parties/PartyCard";
import Alert from "@/components/ui/Alert";
import { getPublicParties, getUpdates } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  const [parties, latest] = await Promise.all([getPublicParties(params.search), getUpdates(undefined, "all")]);
  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">بوابة الأحزاب</h1>
          <p className="mt-2 text-ink/70">عرض محايد للأحزاب النشطة بترتيب ثابت غير مبني على الشعبية.</p>
        </div>
        <form className="flex gap-2">
          <input name="search" defaultValue={params.search || ""} className="w-64 rounded border-line" placeholder="ابحث باسم الحزب أو وصفه" />
          <button className="rounded bg-civic px-4 py-2 text-white">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>
      <div className="mb-6">
        <Alert>آخر المستجدات تظهر هنا كبداية للبوابة، مع الحفاظ على عدم ترتيب الأحزاب حسب التفاعل أو الشعبية.</Alert>
      </div>
      <section className="mb-8 grid gap-3 md:grid-cols-3">
        {(latest as any[]).slice(0, 3).map((item) => (
          <Link key={`${item.type}-${item.item._id}`} href="/updates" className="card p-4 text-sm hover:border-civic">
            <span className="text-civic">{item.type === "post" ? "منشور" : "تصويت"}</span>
            <p className="mt-2 line-clamp-2">{item.type === "post" ? item.item.title || item.item.content : item.item.question}</p>
          </Link>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(parties as any[]).map((party) => <PartyCard key={party._id} party={party} />)}
      </section>
    </main>
  );
}
