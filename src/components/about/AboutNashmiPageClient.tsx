"use client";

import Link from "next/link";
import { ArrowLeft, Bot, Building2, ClipboardList, Eye, MessageCircle, Newspaper, PlayCircle, Scale, ShieldCheck, Target, Users } from "lucide-react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { getLocalizedValue } from "@/lib/localization";

type AboutContent = {
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr?: string | null;
  bodyEn?: string | null;
  youtubeVideoId?: string | null;
};

const copy = {
  ar: {
    eyebrow: "منصة مدنية أردنية",
    lead: "نشمي منصة رقمية أردنية تعزز المشاركة المدنية وتسهّل الوصول إلى المعلومات الحزبية والانتخابية والتشريعية بطريقة مبسطة وموثوقة.",
    videoPending: "سيتم إضافة الفيديو التعريفي قريبًا",
    videoBody: "سيعرض الفيديو طريقة استخدام المنصة وخدماتها الأساسية للمواطنين والجهات الناشرة.",
    pillars: [
      { title: "رسالتنا", body: "تعزيز الوعي القانوني والانتخابي وتشجيع المشاركة العامة الواعية بلغة واضحة ومحايدة.", icon: ShieldCheck },
      { title: "رؤيتنا", body: "مساحة رقمية أردنية موثوقة تجعل المعرفة المدنية أقرب وأسهل لكل مواطن.", icon: Eye },
      { title: "هدفنا", body: "تنظيم المعلومات والخدمات العامة في تجربة واحدة تساعد على الفهم والمتابعة والمشاركة.", icon: Target }
    ],
    servicesTitle: "خدمات نشمي",
    services: [
      { title: "افهم قانونك", body: "شرح مبسط للقوانين والمواد العامة بطريقة عملية.", icon: Scale },
      { title: "بوابة الأحزاب", body: "متابعة الأحزاب والصفحات الرسمية دون تفضيل أو انحياز.", icon: Building2 },
      { title: "آخر المستجدات", body: "منشورات وتصويتات واستبيانات في تغذية واحدة سهلة التصفح.", icon: Newspaper },
      { title: "الاستبيانات والمشاركة", body: "قياس رأي منظم ومشاركة مجتمعية قابلة للمتابعة.", icon: ClipboardList },
      { title: "المساعد الذكي", body: "إجابات توعوية محايدة حول القوانين والمنصة.", icon: Bot },
      { title: "حوار مسؤول", body: "تفاعل يحترم اختلاف الآراء ويركز على الوضوح والمصادر.", icon: MessageCircle }
    ],
    whyTitle: "لماذا نشمي؟",
    whyBody: "لأن المشاركة الواعية تبدأ من الوصول السهل إلى المعلومة. نشمي يساعد المواطنين على متابعة الشأن العام، فهم القوانين، قراءة مستجدات الأحزاب والجهات الرسمية، والمشاركة في استطلاعات واستبيانات منظمة داخل مساحة رقمية واضحة.",
    audienceTitle: "لمن صُممت المنصة؟",
    audience: ["للمواطنين الباحثين عن معلومة مبسطة", "للشباب المهتمين بالمشاركة المدنية", "للأحزاب والجهات الناشرة التي تريد تواصلًا منظمًا", "لكل من يريد متابعة الشأن العام من مصدر مرتب"],
    ctaTitle: "ابدأ من المساحة التي تهمك",
    updates: "آخر المستجدات",
    parties: "بوابة الأحزاب",
    laws: "افهم قانونك"
  },
  en: {
    eyebrow: "Jordanian civic platform",
    lead: "Nashmi is a Jordanian digital platform that strengthens civic participation and simplifies access to party, electoral, and legislative information in a clear and trusted way.",
    videoPending: "Introductory video coming soon",
    videoBody: "The video will introduce the platform, its core services, and how citizens and publishers can use it.",
    pillars: [
      { title: "Our Mission", body: "Promote legal and electoral awareness and encourage informed public participation through neutral, accessible language.", icon: ShieldCheck },
      { title: "Our Vision", body: "A trusted Jordanian digital space that brings civic knowledge closer to every citizen.", icon: Eye },
      { title: "Our Goal", body: "Organize public information and services in one experience for understanding, following, and participating.", icon: Target }
    ],
    servicesTitle: "Nashmi Services",
    services: [
      { title: "Know Your Law", body: "Simple explanations of laws and public concepts.", icon: Scale },
      { title: "Parties Portal", body: "Follow parties and official pages without preference or bias.", icon: Building2 },
      { title: "Latest Updates", body: "Posts, polls, and surveys in one readable feed.", icon: Newspaper },
      { title: "Surveys and Participation", body: "Organized opinion gathering and community participation.", icon: ClipboardList },
      { title: "AI Assistant", body: "Neutral awareness answers about laws and Nashmi.", icon: Bot },
      { title: "Responsible Dialogue", body: "Interaction that respects different views and clear sourcing.", icon: MessageCircle }
    ],
    whyTitle: "Why Nashmi?",
    whyBody: "Informed participation starts with easy access to information. Nashmi helps citizens follow public affairs, understand laws, read party and official updates, and participate in organized polls and surveys within one clear digital space.",
    audienceTitle: "Who Is It For?",
    audience: ["Citizens looking for simpler information", "Young people interested in civic participation", "Parties and publishers seeking organized communication", "Anyone following public affairs from a structured source"],
    ctaTitle: "Start with what matters to you",
    updates: "Latest Updates",
    parties: "Parties Portal",
    laws: "Know Your Law"
  }
};

export default function AboutNashmiPageClient({ content }: { content: AboutContent }) {
  const { language, t } = useTranslation();
  const localized = copy[language];
  const title = getLocalizedValue(content, "title", language) || t("about.defaultTitle");
  const body = getLocalizedValue(content, "body", language) || localized.lead;
  const embedUrl = content.youtubeVideoId ? youtubeEmbedUrl(content.youtubeVideoId) : null;

  return (
    <main className="container-page py-10">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div className="max-w-4xl">
          <p className="text-sm font-black text-civic dark:text-emerald-200">{localized.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{title}</h1>
          <p className="mt-5 text-xl font-bold leading-10 text-ink/80 dark:text-slate-200">{localized.lead}</p>
          <p className="mt-4 max-w-3xl whitespace-pre-line leading-8 text-ink/68 dark:text-slate-300">{body}</p>
        </div>
        <section aria-label={t("about.videoTitle")} className="overflow-hidden rounded-2xl border border-line bg-ink text-white shadow-soft">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={t("about.videoTitle")}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="grid min-h-48 place-items-center p-6 text-center">
              <div>
                <PlayCircle className="mx-auto mb-3 h-10 w-10 text-emerald-200" />
                <h2 className="text-xl font-black">{localized.videoPending}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-white/74">{localized.videoBody}</p>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {localized.pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.title} className="rounded-2xl border border-line bg-white p-5 shadow-sm dark:bg-slate-950">
              <Icon className="mb-4 h-7 w-7 text-civic dark:text-emerald-200" />
              <h2 className="text-xl font-black">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-300">{pillar.body}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-12" aria-labelledby="about-services-title">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-civic dark:text-emerald-200" />
          <h2 id="about-services-title" className="text-2xl font-black">{localized.servicesTitle}</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {localized.services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="card card-hover p-5">
                <Icon className="mb-4 h-8 w-8 text-civic dark:text-emerald-200" />
                <h3 className="text-lg font-black">{service.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-300">{service.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-civic/20 bg-civic/5 p-6 dark:bg-emerald-200/8">
          <h2 className="text-2xl font-black">{localized.whyTitle}</h2>
          <p className="mt-3 leading-8 text-ink/72 dark:text-slate-300">{localized.whyBody}</p>
        </article>
        <article className="rounded-2xl border border-line bg-white p-6 shadow-sm dark:bg-slate-950">
          <h2 className="text-2xl font-black">{localized.audienceTitle}</h2>
          <div className="mt-4 grid gap-2">
            {localized.audience.map((item) => (
              <p key={item} className="flex items-start gap-2 rounded-lg bg-paper/65 px-3 py-2 text-sm font-semibold leading-7 text-ink/70 dark:bg-slate-900 dark:text-slate-300">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-civic dark:text-emerald-200" />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-12 rounded-2xl border border-line bg-white p-6 shadow-soft dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-black">{localized.ctaTitle}</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/updates" className="inline-flex items-center gap-2 rounded-xl bg-civic px-4 py-2.5 text-sm font-black text-white hover:bg-civic/90">
              {localized.updates}
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/parties" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-black text-civic hover:bg-civic/10 dark:text-emerald-200">
              {localized.parties}
            </Link>
            <Link href="/laws" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-black text-civic hover:bg-civic/10 dark:text-emerald-200">
              {localized.laws}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
