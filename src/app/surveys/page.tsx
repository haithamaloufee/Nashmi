import Link from "next/link";
import { Search } from "lucide-react";
import SurveyCard from "@/components/surveys/SurveyCard";
import SurveyEmptyState from "@/components/surveys/SurveyEmptyState";
import { getSurveys } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const filters = [
  { value: "all", label: "الكل" },
  { value: "parties", label: "الأحزاب" },
  { value: "authority", label: "الهيئة" },
  { value: "platform", label: "المنصة" }
];

export default async function SurveysPage({ searchParams }: { searchParams: Promise<{ search?: string; filter?: string; sort?: string }> }) {
  const params = await searchParams;
  const search = params.search || "";
  const filter = params.filter || "all";
  const sort = params.sort || "newest";
  const surveys = (await getSurveys(search, filter, sort)) as any[];

  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="rounded-full bg-civic/10 px-3 py-1 text-sm font-black text-civic">Community Pulse</span>
          <h1 className="mt-3 text-3xl font-black">نبض المجتمع</h1>
          <p className="mt-2 max-w-3xl leading-7 text-ink/70 dark:text-slate-300">استبيانات تفاعلية من الأحزاب والجهات الرسمية والمنصة لقياس الرأي والمشاركة المدنية.</p>
        </div>
        <Link href="/updates" className="rounded border border-line px-4 py-2 text-sm font-bold hover:border-civic hover:text-civic">آخر المستجدات</Link>
      </div>

      <form className="card mb-6 grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_210px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
          <input name="search" defaultValue={search} className="w-full rounded border-line ps-10" placeholder="ابحث في الاستبيانات..." />
        </label>
        <select name="filter" defaultValue={filter} className="rounded border-line">
          {filters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="rounded border-line">
          <option value="newest">الأحدث</option>
          <option value="most_participated">الأكثر مشاركة</option>
        </select>
        <button className="rounded bg-civic px-5 py-2 font-black text-white hover:bg-civic/90">تطبيق</button>
      </form>

      {surveys.length === 0 ? (
        <SurveyEmptyState title="لا توجد استبيانات مطابقة" body="جرّب تغيير البحث أو الفلتر." />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {surveys.map((survey) => <SurveyCard key={survey._id} survey={survey} />)}
        </section>
      )}
    </main>
  );
}
