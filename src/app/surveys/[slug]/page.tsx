import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Share2 } from "lucide-react";
import SurveyDateMeta from "@/components/surveys/SurveyDateMeta";
import SurveyForm from "@/components/surveys/SurveyForm";
import SurveyStatusBadge from "@/components/surveys/SurveyStatusBadge";
import SafeImage from "@/components/ui/SafeImage";
import ShareMenu from "@/components/ui/ShareMenu";
import { getCurrentUser } from "@/lib/auth";
import { getSurveyBySlug } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function SurveyDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const survey = (await getSurveyBySlug(slug, user)) as any;
  if (!survey) notFound();
  const publisher = survey.publisherSnapshot || {};

  return (
    <main className="container-page py-8">
      <Link href="/surveys" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-civic hover:underline">
        <ArrowRight className="h-4 w-4" />
        العودة إلى Community Pulse
      </Link>

      <section className="card overflow-hidden bg-white dark:bg-slate-950">
        <div className="bg-[linear-gradient(135deg,rgba(18,107,111,0.13),rgba(168,93,60,0.08))] p-6 dark:bg-none">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex min-w-0 gap-4">
              <SafeImage
                src={publisher.imageUrl || null}
                alt={publisher.name || survey.title}
                className="h-16 w-16 shrink-0 rounded bg-white object-contain p-1 ring-1 ring-line dark:bg-slate-900"
                fallback={<div className="grid h-16 w-16 shrink-0 place-items-center rounded bg-civic text-2xl font-black text-white">{(publisher.name || "N").slice(0, 1)}</div>}
                localPrefixes={["/uploads/", "/images/", "/related/"]}
              />
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-civic shadow-sm dark:bg-slate-900">Community Pulse</span>
                  <SurveyStatusBadge status={survey.lifecycleStatus} />
                  {publisher.badge ? <span className="inline-flex items-center gap-1 rounded-full bg-civic/10 px-2.5 py-1 text-xs font-bold text-civic"><ShieldCheck className="h-3.5 w-3.5" />{publisher.badge}</span> : null}
                </div>
                <h1 className="text-3xl font-black leading-[1.4]">{survey.title}</h1>
                {publisher.name ? <p className="mt-2 text-sm font-bold text-ink/65 dark:text-slate-300">نشر بواسطة: {publisher.name}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareMenu url={`/surveys/${survey.slug || survey._id}`} title={survey.title} text={survey.description || survey.title} />
              <span className="inline-flex items-center gap-1 rounded border border-line bg-white px-3 py-2 text-sm font-bold text-ink/65 dark:bg-slate-900 dark:text-slate-300">
                <Share2 className="h-4 w-4 text-civic" />
                مشاركة مسؤولة
              </span>
            </div>
          </div>
          {survey.description ? <p className="mt-5 max-w-5xl whitespace-pre-line leading-8 text-ink/75 dark:text-slate-300">{survey.description}</p> : null}
          <div className="mt-5">
            <SurveyDateMeta startsAt={survey.startsAt} endsAt={survey.endsAt} totalResponses={survey.totalResponses} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0">
          <SurveyForm survey={survey} isLoggedIn={Boolean(user)} />
        </section>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5 text-sm leading-7 text-ink/65 dark:text-slate-300">
            <h2 className="mb-2 font-black text-ink dark:text-white">ملاحظة الخصوصية</h2>
            <p>تُستخدم إجابتك لأغراض إحصائية داخل الاستبيان، ولا يتم عرض الإجابات النصية للعامة في هذه المرحلة.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
