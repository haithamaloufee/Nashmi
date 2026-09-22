import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, Newspaper, Scale, ShieldCheck, Users } from "lucide-react";
import HomeFeedPreview from "@/components/landing/HomeFeedPreview";
import SiteFooter from "@/components/layout/SiteFooter";
import SafeImage from "@/components/ui/SafeImage";
import { I18nText } from "@/components/i18n/LanguageProvider";
import { getPublicParties, getUpdates } from "@/lib/serverData";

export const dynamic = "force-dynamic";

type FeedItem = { type: "post" | "poll" | "survey"; publishedAt: string; item: any };
type Party = { _id?: string; slug?: string; name?: string; shortDescription?: string; logoUrl?: string | null; isVerified?: boolean };

const paths = [
  { href: "/updates", icon: Newspaper, title: "home.path.updates.title", body: "home.path.updates.body" },
  { href: "/laws", icon: Scale, title: "home.path.laws.title", body: "home.path.laws.body" },
  { href: "/parties", icon: Building2, title: "home.path.parties.title", body: "home.path.parties.body" }
] as const;

export default async function HomePage() {
  const [updates, parties] = await Promise.all([getUpdates("", "all"), getPublicParties()]);
  const latest = (updates as FeedItem[]).slice(0, 3);
  const featuredParties = (parties as Party[]).slice(0, 3);

  return (
    <main id="top">
      <section className="relative isolate overflow-hidden bg-[#10252b] text-white" aria-labelledby="hero-title">
        <Image src="/images/sharek-hero.png" alt="" fill priority sizes="100vw" className="pointer-events-none absolute inset-0 -z-20 object-cover object-center" />
        <div className="home-hero-overlay absolute inset-0 -z-10" />
        <div className="container-page flex min-h-[620px] items-center pb-14 pt-28 sm:min-h-[650px] sm:pb-16 sm:pt-32 lg:min-h-[680px]">
          <div className="max-w-[760px] text-shadow-sm">
            <h1 id="hero-title" className="max-w-[720px] text-[2.25rem] font-black leading-[1.35] text-white sm:text-5xl sm:leading-[1.25] lg:text-[3.55rem]">
              <I18nText id="home.hero.title" />
            </h1>
            <p className="mt-5 max-w-[680px] text-base leading-8 text-white/[0.86] sm:text-lg sm:leading-9 lg:text-xl">
              <I18nText id="home.hero.body" />
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/updates" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-200 px-5 font-black text-[#10252b] shadow-[0_12px_30px_rgba(0,0,0,.18)] hover:-translate-y-0.5 hover:bg-emerald-100">
                <I18nText id="home.hero.primary" />
                <ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
              <Link href="/laws" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-5 font-bold text-white backdrop-blur-sm hover:bg-white/[0.18]">
                <I18nText id="home.hero.secondary" />
              </Link>
            </div>
            <p className="mt-6 max-w-xl border-s-2 border-emerald-200/70 ps-4 text-sm leading-7 text-white/[0.76]">
              <I18nText id="home.hero.notice" />
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16" aria-labelledby="latest-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-civic"><I18nText id="home.latest.eyebrow" /></p>
            <h2 id="latest-title" className="mt-1 text-2xl font-black sm:text-3xl"><I18nText id="home.latest.title" /></h2>
          </div>
          <Link href="/updates" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-civic/25 bg-civic/[0.07] px-4 text-sm font-black text-civic hover:border-civic hover:bg-civic hover:text-white dark:text-emerald-200">
            <I18nText id="home.latest.all" />
            <ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,820px)_280px] lg:justify-center xl:grid-cols-[minmax(0,840px)_300px]">
          <div className="min-w-0">
            {latest.length ? <HomeFeedPreview items={latest} /> : (
              <div className="card p-8 text-center">
                <Newspaper className="mx-auto h-8 w-8 text-civic" />
                <h3 className="mt-3 text-lg font-black"><I18nText id="home.latest.empty" /></h3>
                <p className="mt-2 text-sm leading-7 text-ink/[0.64]"><I18nText id="home.latest.emptyHint" /></p>
              </div>
            )}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="مسارات سريعة">
            <div className="card p-5">
              <h3 className="font-black"><I18nText id="home.quick.title" /></h3>
              <div className="mt-3 grid gap-1">
                {paths.map((path) => {
                  const Icon = path.icon;
                  return (
                    <Link key={path.href} href={path.href} className="focus-ring group flex min-h-12 items-center gap-3 rounded-xl px-2 text-sm font-bold text-ink/[0.72] hover:bg-civic/[0.08] hover:text-civic dark:text-slate-200 dark:hover:text-emerald-200">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-civic/[0.08] text-civic dark:bg-emerald-200/10 dark:text-emerald-200"><Icon className="h-4 w-4" /></span>
                      <I18nText id={path.title} />
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl bg-[#123941] p-5 text-white shadow-soft">
              <ShieldCheck className="h-6 w-6 text-emerald-200" />
              <h3 className="mt-3 font-black"><I18nText id="home.trust.title" /></h3>
              <p className="mt-2 text-sm leading-7 text-white/[0.76]"><I18nText id="home.trust.body" /></p>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-line/70 bg-white/[0.58] py-12 dark:border-slate-800 dark:bg-slate-950/[0.45]" aria-labelledby="paths-title">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-civic"><I18nText id="home.paths.eyebrow" /></p>
            <h2 id="paths-title" className="mt-1 text-2xl font-black sm:text-3xl"><I18nText id="home.paths.title" /></h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {paths.map((path) => {
              const Icon = path.icon;
              return (
                <Link key={path.href} href={path.href} className="card card-hover group p-5 focus-ring">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-civic/[0.09] text-civic dark:bg-emerald-200/10 dark:text-emerald-200"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-lg font-black"><I18nText id={path.title} /></h3>
                  <p className="mt-2 text-sm leading-7 text-ink/[0.66] dark:text-slate-300"><I18nText id={path.body} /></p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-civic group-hover:underline dark:text-emerald-200"><I18nText id="common.openPath" /><ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {featuredParties.length ? (
        <section className="container-page py-12 sm:py-16" aria-labelledby="parties-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-civic"><I18nText id="home.parties.eyebrow" /></p>
              <h2 id="parties-title" className="mt-1 text-2xl font-black sm:text-3xl"><I18nText id="home.parties.title" /></h2>
            </div>
            <Link href="/parties" className="focus-ring text-sm font-black text-civic hover:underline dark:text-emerald-200"><I18nText id="home.parties.all" /></Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {featuredParties.map((party) => (
              <Link key={party._id || party.slug || party.name} href={party.slug ? `/parties/${party.slug}` : "/parties"} className="card card-hover flex min-h-28 items-center gap-4 p-4 focus-ring">
                <SafeImage src={party.logoUrl} alt={party.name || ""} className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1 ring-1 ring-line" fallback={<span className="grid h-16 w-16 place-items-center rounded-2xl bg-civic/10 text-xl font-black text-civic">{party.name?.slice(0, 1) || "ح"}</span>} localPrefixes={["/images/", "/related/", "/uploads/"]} />
                <div className="min-w-0"><h3 className="truncate font-black">{party.name}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/[0.62] dark:text-slate-300">{party.shortDescription || <I18nText id="home.parties.fallback" />}</p></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="bg-[#123941] py-12 text-white" aria-labelledby="neutrality-title">
        <div className="container-page flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3"><Users className="h-6 w-6 text-emerald-200" /><h2 id="neutrality-title" className="text-2xl font-black"><I18nText id="home.neutrality.title" /></h2></div>
            <p className="mt-3 leading-8 text-white/[0.76]"><I18nText id="home.neutrality.body" /></p>
          </div>
          <Link href="/about-nashmi" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.24] px-5 font-bold text-white hover:bg-white/10"><I18nText id="home.neutrality.cta" /></Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
