import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BarChart3,
  Bot,
  Building2,
  ChevronUp,
  ExternalLink,
  Flag,
  Info,
  Newspaper,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Vote,
  Zap
} from "lucide-react";
import ElectionStatsSection from "@/components/landing/ElectionStatsSection";
import LandingInsightsSections from "@/components/landing/LandingInsightsSections";
import LandingInteractions from "@/components/landing/LandingInteractions";
import RelatedSitesSection from "@/components/landing/RelatedSitesSection";
import RoyalQuotesSection from "@/components/landing/RoyalQuotesSection";
import PlatformIndicatorsSection from "@/components/landing/PlatformIndicatorsSection";
import { I18nText } from "@/components/i18n/LanguageProvider";
import CountUpNumber from "@/components/ui/CountUpNumber";
import { getCurrentUser } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const valuesCards = [
  {
    titleKey: "home.values.vision",
    textKey: "home.values.visionText",
    icon: Flag
  },
  {
    titleKey: "home.values.mission",
    textKey: "home.values.missionText",
    icon: Target
  },
  {
    titleKey: "home.values.goal",
    textKey: "home.values.goalText",
    icon: Award
  },
  {
    titleKey: "home.values.core",
    textKey: "home.values.coreText",
    icon: ShieldCheck
  }
] satisfies Array<{ titleKey: TranslationKey; textKey: TranslationKey; icon: typeof Flag }>;

const officialLinks = [
  { label: "الهيئة المستقلة للانتخاب", href: "https://www.iec.jo/ar" },
  { label: "عن الهيئة", href: "https://www.iec.jo/ar/about-us" },
  { label: "التشريعات النافذة", href: "https://www.iec.jo/ar/applicable-legislation" },
  { label: "التقارير والوثائق", href: "https://www.iec.jo/ar/archive/reports-and-documents" },
  { label: "سجل الأحزاب", href: "https://www.iec.jo/ar/party-registry" },
  { label: "اتصل بنا", href: "https://www.iec.jo/ar/contact-us" }
];

const mainLinks = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.updates", href: "/updates" },
  { labelKey: "nav.parties", href: "/parties" },
  { labelKey: "nav.laws", href: "/laws" },
  { labelKey: "nav.chat", href: "/chat" }
] satisfies Array<{ labelKey: TranslationKey; href: string }>;

function ExternalAnchor({ href, children, className, ariaLabel }: { href: string; children: React.ReactNode; className?: string; ariaLabel?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

const partySnapshotStats = [
  { labelKey: "home.stats.parties", value: 32, icon: Building2 },
  { labelKey: "home.stats.members", value: 86625, icon: Users },
  { labelKey: "home.stats.male", value: 49699, icon: Users },
  { labelKey: "home.stats.female", value: 36926, icon: Users },
  { labelKey: "home.stats.youth", value: 30556, icon: Vote }
] satisfies Array<{ labelKey: TranslationKey; value: number; icon: typeof Building2 }>;

export default async function HomePage() {
  const user = await getCurrentUser();
  const showAdminAccess = user?.role === "admin" || user?.role === "super_admin";
  const quickAccessCards = [
    {
      href: "/parties",
      titleKey: "nav.parties",
      textKey: "party.portal.subtitle",
      icon: Building2
    },
    {
      href: "/updates",
      titleKey: "nav.updates",
      textKey: "updates.subtitle",
      icon: Newspaper
    },
    {
      href: "/chat",
      titleKey: "nav.chat",
      textKey: "updates.assistantBody",
      icon: Bot
    },
    {
      href: "/laws",
      titleKey: "nav.laws",
      textKey: "laws.subtitle",
      icon: Scale
    },
    ...(showAdminAccess
      ? [
          {
            href: "/admin",
            titleKey: "nav.dashboard",
            textKey: "admin.about.hint",
            icon: BarChart3
          }
        ]
      : [])
  ];

  return (
    <main id="top">
      <LandingInteractions />

      <section className="relative isolate overflow-hidden border-b border-line bg-ink text-white" aria-labelledby="hero-title">
        <Image src="/images/sharek-hero.png" alt="" fill priority sizes="100vw" className="pointer-events-none absolute inset-0 -z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(15,25,33,.82)_0%,rgba(15,25,33,.58)_38%,rgba(18,107,111,.26)_68%,rgba(15,25,33,.18)_100%)]" />
        <div className="container-page flex min-h-[560px] flex-col justify-center py-16 md:py-20">
          <div className="max-w-3xl text-shadow-sm">
            <p className="mb-5 text-base font-black uppercase tracking-[0.18em] text-white/80"><I18nText id="home.hero.eyebrow" /></p>
            <h1 id="hero-title" className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              <I18nText id="home.hero.title" />
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/85 sm:text-xl sm:leading-9 md:text-2xl md:leading-[2.7rem]">
              <I18nText id="home.hero.body" />
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/parties" className="focus-ring inline-flex items-center justify-center rounded-2xl bg-civic px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:bg-civic/90 active:scale-[0.98]">
                <I18nText id="home.hero.primary" />
              </Link>
              <Link href="/laws" className="focus-ring inline-flex items-center justify-center rounded-2xl border border-white/70 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition duration-200 hover:bg-white/20 hover:text-white active:scale-[0.98]">
                <I18nText id="home.hero.secondary" />
              </Link>
            </div>
            <div className="mt-6 max-w-lg rounded-3xl border border-white/20 bg-white/15 p-4 text-sm leading-7 text-white/90 backdrop-blur sm:text-base">
              <I18nText id="home.hero.notice" />
            </div>
          </div>
        </div>
      </section>

      <RoyalQuotesSection />

      <PlatformIndicatorsSection />

      <section className="container-page py-6" aria-label="تنويه المشروع التجريبي">
        <div className="reveal-on-scroll flex flex-col gap-4 rounded border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm md:flex-row md:items-center md:justify-between" data-reveal>
          <div className="flex gap-3">
            <Info className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
            <p className="leading-8">
              <strong><I18nText id="home.alert.title" /></strong> <I18nText id="home.alert.body" />
            </p>
          </div>
          <ExternalAnchor href="https://www.iec.jo/ar" className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800">
            <I18nText id="home.alert.cta" />
            <ExternalLink className="h-4 w-4" />
          </ExternalAnchor>
        </div>
      </section>

      <section className="container-page grid gap-6 py-14 lg:grid-cols-[1fr_0.9fr]" id="about" aria-labelledby="about-title">
        <div className="reveal-on-scroll card p-6 lg:p-8" data-reveal>
          <p className="mb-3 text-sm font-bold text-civic"><I18nText id="home.about.eyebrow" /></p>
          <h2 id="about-title" className="text-3xl font-black"><I18nText id="home.about.title" /></h2>
          <p className="mt-5 text-lg leading-9 text-ink/75">
            <I18nText id="home.about.body" />
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/updates" className="focus-ring rounded bg-civic px-5 py-3 font-semibold text-white hover:bg-civic/90">
              <I18nText id="home.about.primary" />
            </Link>
            <Link href="/chat" className="focus-ring rounded border border-line px-5 py-3 font-semibold text-civic hover:border-civic hover:bg-civic/5">
              <I18nText id="home.about.secondary" />
            </Link>
          </div>
        </div>
        <div className="reveal-on-scroll relative min-h-[340px] overflow-hidden rounded border border-line bg-ink shadow-soft" data-reveal>
          <Image src="/images/sharek-hero.png" alt="واجهة رمزية لمنصة نشمي" fill sizes="(min-width: 1024px) 44vw, 100vw" className="pointer-events-none object-cover opacity-75" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(23,33,43,.86),rgba(18,107,111,.15))]" />
          <div className="absolute inset-x-5 bottom-5 rounded border border-white/20 bg-white/12 p-5 text-white backdrop-blur">
            <Sparkles className="mb-3 h-7 w-7 text-emerald-200" />
            <p className="text-lg font-bold"><I18nText id="home.visual.title" /></p>
            <p className="mt-2 text-sm leading-7 text-white/78"><I18nText id="home.visual.body" /></p>
          </div>
        </div>
      </section>

      <section className="landing-pattern bg-ink py-16 text-white" id="values" aria-labelledby="values-title">
        <div className="container-page">
          <div className="reveal-on-scroll mb-8 max-w-2xl" data-reveal>
            <p className="mb-2 text-sm font-bold text-emerald-200"><I18nText id="home.values.eyebrow" /></p>
            <h2 id="values-title" className="text-3xl font-black"><I18nText id="home.values.title" /></h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {valuesCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.titleKey} className="reveal-on-scroll rounded border border-white/15 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-200/50 hover:bg-white/15 hover:shadow-soft" data-reveal>
                  <Icon className="mb-5 h-10 w-10 text-emerald-200" />
                  <h3 className="text-2xl font-black"><I18nText id={card.titleKey} /></h3>
                  <p className="mt-3 leading-8 text-white/78"><I18nText id={card.textKey} /></p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#0f172a,#126b6f)] py-16" id="statistics" aria-labelledby="stats-title">
        <div className="container-page">
          <div className="reveal-on-scroll mb-8 flex flex-col justify-between gap-4 text-white md:flex-row md:items-end" data-reveal>
            <div>
              <p className="mb-2 text-sm font-bold text-emerald-200"><I18nText id="home.stats.eyebrow" /></p>
              <h2 id="stats-title" className="text-3xl font-black"><I18nText id="home.stats.title" /></h2>
            </div>
            <p className="max-w-xl leading-8 text-white/75"><I18nText id="home.stats.note" /></p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {partySnapshotStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.labelKey} className="reveal-on-scroll rounded border border-emerald-200/20 bg-white/[0.08] p-5 text-white shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:bg-white/[0.12] dark:bg-slate-950/35" data-reveal>
                  <Icon className="mb-4 h-8 w-8 text-emerald-200" />
                  <span className="block text-4xl font-black leading-none text-white drop-shadow-sm">
                    <CountUpNumber value={stat.value} duration={1200} />
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-white/78"><I18nText id={stat.labelKey} /></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <LandingInsightsSections />

      <ElectionStatsSection />

      <section className="container-page py-14" id="services" aria-labelledby="services-title">
        <div className="reveal-on-scroll mb-8 flex items-end justify-between gap-4" data-reveal>
          <div>
            <p className="mb-2 text-sm font-bold text-civic"><I18nText id="home.services.eyebrow" /></p>
            <h2 id="services-title" className="text-3xl font-black"><I18nText id="home.services.title" /></h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="reveal-on-scroll card card-hover group p-5 focus-ring" data-reveal>
                <Icon className="mb-4 h-8 w-8 text-civic transition group-hover:scale-110" />
                <h3 className="text-lg font-black"><I18nText id={card.titleKey as TranslationKey} /></h3>
                <p className="mt-3 min-h-20 text-sm leading-7 text-ink/70"><I18nText id={card.textKey as TranslationKey} /></p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-civic">
                  <I18nText id="common.openPath" />
                  <Zap className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <RelatedSitesSection />

      <footer className="footer-pattern bg-[#263f48] pb-28 pt-14 text-white lg:pb-16" id="footer" aria-labelledby="footer-title">
        <div className="container-page grid gap-9 md:grid-cols-2 xl:grid-cols-[1.1fr_0.8fr_1fr_1fr]">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <Image src="/images/nashmi logo.png" alt="شعار منصة نشمي" width={72} height={72} className="h-16 w-16 rounded-full bg-white/95 object-contain p-1" />
              <div>
                <h2 id="footer-title" className="text-2xl font-black">نشمي</h2>
                <p className="text-sm text-white/62">Nashmi civic demo</p>
              </div>
            </div>
            <p className="leading-8 text-white/78"><I18nText id="home.about.body" /></p>
            <p className="mt-4 rounded border border-white/15 bg-white/[0.08] p-3 text-sm leading-7 text-white/76"><I18nText id="home.footer.demo" /></p>
          </section>

          <nav aria-label="روابط نشمي">
            <h3 className="mb-4 text-lg font-black"><I18nText id="home.footer.links" /></h3>
            <ul className="space-y-3 text-white/78">
              {mainLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="focus-ring hover:text-emerald-200 hover:underline">
                    <I18nText id={link.labelKey} />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="#related" className="focus-ring hover:text-emerald-200 hover:underline">
                  <I18nText id="common.relatedSites" />
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="روابط الهيئة الرسمية">
            <div className="mb-4 flex items-center gap-3">
              <Image src="/related/iec-logo.png" alt="شعار الهيئة المستقلة للانتخاب" width={48} height={48} className="h-12 w-12 rounded bg-white object-contain p-1" />
            <h3 className="text-lg font-black"><I18nText id="home.footer.officialLinks" /></h3>
            </div>
            <ul className="space-y-3 text-white/78">
              {officialLinks.map((link) => (
                <li key={link.href}>
                  <ExternalAnchor href={link.href} className="focus-ring inline-flex items-center gap-2 hover:text-emerald-200 hover:underline">
                    {link.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </ExternalAnchor>
                </li>
              ))}
            </ul>
          </nav>

          <section>
            <h3 className="mb-4 text-lg font-black"><I18nText id="home.footer.noticeTitle" /></h3>
            <p className="leading-8 text-white/78"><I18nText id="home.footer.notice" /></p>
            <ExternalAnchor href="https://www.iec.jo/ar" className="focus-ring mt-5 inline-flex items-center gap-2 rounded bg-white px-4 py-2 font-bold text-civic hover:bg-emerald-50">
              <I18nText id="home.footer.iecOfficial" />
              <ExternalLink className="h-4 w-4" />
            </ExternalAnchor>
            <a href="#top" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:border-emerald-200 hover:text-emerald-200" aria-label="العودة إلى أعلى الصفحة">
              <ChevronUp className="h-4 w-4" />
              <I18nText id="common.goTop" />
            </a>
          </section>
        </div>
        <div className="container-page mt-10 border-t border-white/[0.14] pt-5 text-sm text-white/70"><I18nText id="home.footer.rights" /></div>
      </footer>
    </main>
  );
}
