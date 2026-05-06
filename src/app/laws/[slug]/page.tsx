import Link from "next/link";
import { notFound } from "next/navigation";
import Alert from "@/components/ui/Alert";
import { getLawBySlug } from "@/lib/serverData";
import { youtubeEmbedUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function LawDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const law = (await getLawBySlug(slug)) as any;
  if (!law) notFound();
  const embedUrl = law.youtubeVideoId ? youtubeEmbedUrl(law.youtubeVideoId) : null;
  return (
    <main className="container-page py-8">
      <article className="card p-6">
        <span className="rounded bg-civic/10 px-3 py-1 text-sm text-civic">{law.category}</span>
        <h1 className="mt-4 text-3xl font-black">{law.title}</h1>
        <p className="mt-3 leading-8 text-ink/70 dark:text-slate-200">{law.shortDescription}</p>
        <div className="mt-5"><Alert>شرح القوانين للتوعية العامة وليس استشارة قانونية رسمية.</Alert></div>
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {law.originalText ? (
              <div>
                <h2 className="mb-2 text-xl font-bold">النص الأصلي</h2>
                <p className="whitespace-pre-line leading-8 text-ink/75 dark:text-slate-200">{law.originalText}</p>
              </div>
            ) : null}
            <div>
              <h2 className="mb-2 text-xl font-bold">شرح مبسط</h2>
              <p className="whitespace-pre-line leading-8 text-ink/80 dark:text-slate-200">{law.simplifiedExplanation}</p>
            </div>
            {law.practicalExample ? (
              <div>
                <h2 className="mb-2 text-xl font-bold">مثال عملي</h2>
                <p className="leading-8 text-ink/75 dark:text-slate-200">{law.practicalExample}</p>
              </div>
            ) : null}
          </div>
          <aside className="space-y-4">
            {embedUrl ? (
              <iframe
                className="aspect-video w-full rounded border border-line"
                src={embedUrl}
                title={law.title}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : null}
            <div className="rounded border border-line p-4 text-sm leading-7 text-ink/70 dark:text-slate-300">
              <p>المصدر: {law.sourceName}</p>
              <p>نوع المصدر: {law.sourceType}</p>
              {law.articleNumber ? <p>المادة: {law.articleNumber}</p> : null}
              {law.lastVerifiedAt ? <p>آخر تحقق: {new Date(law.lastVerifiedAt).toLocaleDateString("ar-JO")}</p> : null}
              {law.officialReferenceUrl ? <a className="font-semibold text-civic" href={law.officialReferenceUrl} target="_blank" rel="noreferrer">الرابط الرسمي</a> : null}
            </div>
            <Link href={`/chat?lawId=${law._id}`} className="block rounded bg-civic px-4 py-3 text-center font-semibold text-white">
              اسأل المساعد عن هذا القانون
            </Link>
          </aside>
        </section>
      </article>
    </main>
  );
}
