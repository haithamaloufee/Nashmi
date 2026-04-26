import { Search } from "lucide-react";
import LawCard from "@/components/laws/LawCard";
import Alert from "@/components/ui/Alert";
import { getPublicLaws } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function LawsPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string }> }) {
  const params = await searchParams;
  const data = await getPublicLaws(params.search, params.category);
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-black">افهم قانونك</h1>
      <p className="mt-2 text-ink/70">شرح مبسط للقوانين والمفاهيم الانتخابية من مصادر منشورة.</p>
      <div className="mt-5">
        <Alert>شرح القوانين للتوعية العامة وليس استشارة قانونية رسمية.</Alert>
      </div>
      <form className="my-6 flex flex-wrap gap-2">
        <input name="search" defaultValue={params.search || ""} className="w-72 rounded border-line" placeholder="ابحث عن قانون أو مفهوم" />
        <select name="category" defaultValue={params.category || ""} className="rounded border-line">
          <option value="">كل التصنيفات</option>
          {data.categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <button className="rounded bg-civic px-4 py-2 text-white"><Search className="h-4 w-4" /></button>
      </form>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data.laws as any[]).map((law) => <LawCard key={law._id} law={law} />)}
      </section>
    </main>
  );
}
