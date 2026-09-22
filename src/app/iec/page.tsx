import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ExternalLink, Globe, Info, Mail, Newspaper, Phone, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import SurveyFeedCard from "@/components/surveys/SurveyFeedCard";
import { ProfileAccordionCard, ProfileTopScrollReset } from "@/components/profile/ProfileInteractions";
import SafeImage from "@/components/ui/SafeImage";
import DelayedTooltipBadge from "@/components/ui/DelayedTooltipBadge";
import { I18nText } from "@/components/i18n/LanguageProvider";
import LocalizedValue from "@/components/i18n/LocalizedValue";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";
import { getAuthorityProfilePageData } from "@/lib/serverData";

export const dynamic = "force-dynamic";

type AuthorityTimelineItem = {
  type: "post" | "poll" | "survey";
  publishedAt: string | null;
  item: any;
};

function timestamp(value: unknown) {
  const time = new Date(value instanceof Date || typeof value === "string" || typeof value === "number" ? value : 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function OfficialBadge() {
  return (
    <DelayedTooltipBadge
      tooltip="الهيئة المستقلة للانتخاب جهة رسمية مستقلة وليست حزبًا سياسيًا، ولا تتبع لأي حزب أو جهة حزبية. دورها مرتبط بإدارة العملية الانتخابية والإشراف عليها رسميًا."
      className="inline-flex items-center gap-1 rounded-full bg-civic/10 px-3 py-1 text-xs font-bold text-civic outline-none ring-1 ring-civic/20 focus-visible:ring-2"
      ariaLabel="حساب رسمي للهيئة المستقلة للانتخاب"
    >
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      <I18nText id="content.officialAccount" />
    </DelayedTooltipBadge>
  );
}

export default async function IecPage() {
  const data = (await getAuthorityProfilePageData("independent-election-commission")) as any;
  if (!data?.authority) notFound();

  const { authority, posts = [], polls = [], surveys = [] } = data;
  const contact = authority.contact || {};
  const socialLinks = authority.socialLinks || {};
  const officialLinks = authority.officialLinks || [];
  const mediaUrl = typeof authority.logoMediaId === "object" && authority.logoMediaId ? authority.logoMediaId.url : null;
  const coverMediaUrl = typeof authority.coverMediaId === "object" && authority.coverMediaId ? authority.coverMediaId.url : null;
  const logoUrl =
    normalizeSafeImageUrl(mediaUrl, { localPrefixes: ["/images/", "/uploads/", "/related/"] }) ||
    normalizeSafeImageUrl(authority.logoUrl, { localPrefixes: ["/images/", "/related/"] }) ||
    "/related/iec-logo.png";
  const coverUrl = normalizeSafeImageUrl(coverMediaUrl, { localPrefixes: ["/images/", "/uploads/", "/related/"] }) || normalizeSafeImageUrl(authority.coverUrl, { localPrefixes: ["/images/", "/uploads/", "/related/"] });
  const logoFallback = <img src="/related/iec-logo.png" alt="شعار الهيئة المستقلة للانتخاب" className="h-20 w-20 shrink-0 rounded bg-white object-contain p-1 ring-1 ring-line" loading="lazy" decoding="async" />;

  const linkItems = [
    { label: "رابط سجل الأحزاب", url: contact.partyRegistryUrl },
    { label: "منصة الأحزاب السياسية", url: contact.partiesPlatformUrl },
    { label: "منصة التدريب جاهز", url: contact.trainingPlatformUrl }
  ].filter((item) => item.url);
  const allOfficialLinks = [...officialLinks, ...linkItems].filter(
    (item: any, index, items) => item.url && items.findIndex((candidate: any) => candidate.url === item.url) === index
  );
  const timeline: AuthorityTimelineItem[] = [
    ...posts.map((post: any) => ({ type: "post" as const, publishedAt: post.publishedAt || post.createdAt || null, item: post })),
    ...polls.map((poll: any) => ({ type: "poll" as const, publishedAt: poll.publishedAt || poll.createdAt || null, item: poll })),
    ...surveys.map((survey: any) => ({ type: "survey" as const, publishedAt: survey.publishedAt || survey.createdAt || null, item: survey }))
  ].sort((a, b) => timestamp(b.publishedAt) - timestamp(a.publishedAt));

  return (
    <main className="pb-12">
      <ProfileTopScrollReset />

      <section className="border-b border-line bg-white/70 pt-5 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="container-page">
          <div className="overflow-hidden rounded-t-3xl border border-b-0 border-line bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {coverUrl ? (
              <SafeImage src={coverUrl} alt="غلاف الهيئة المستقلة للانتخاب" className="h-44 w-full object-cover sm:h-56 lg:h-64" fallback={<div className="h-44 bg-[linear-gradient(135deg,#126b6f,#dcebe5)] sm:h-56 lg:h-64" />} localPrefixes={["/images/", "/uploads/", "/related/"]} />
            ) : (
              <div className="h-44 bg-[linear-gradient(135deg,#126b6f,#dcebe5)] sm:h-56 lg:h-64" />
            )}

            <div className="px-4 pb-4 sm:px-6">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
                <SafeImage src={logoUrl} alt="شعار الهيئة المستقلة للانتخاب" className="-mt-14 h-28 w-28 shrink-0 rounded-2xl border-4 border-white bg-white object-contain p-1 shadow-md dark:border-slate-950" fallback={logoFallback} localPrefixes={["/images/", "/uploads/", "/related/"]} />
                <div className="min-w-0 pb-1">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-civic/10 px-2.5 py-1 text-xs font-bold text-civic dark:bg-emerald-200/10 dark:text-emerald-100">
                    <Building2 className="h-4 w-4" />
                    <I18nText id="content.independentAuthority" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black sm:text-3xl">{authority.name}</h1>
                    <OfficialBadge />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1 border-t border-line pt-2 text-sm font-bold dark:border-slate-800" aria-label="أقسام صفحة الهيئة">
                <a href="#profile-posts" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-civic/10 px-4 text-civic hover:bg-civic hover:text-white"><Newspaper className="h-4 w-4" />آخر التحديثات</a>
                <a href="#authority-info" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-ink/65 hover:bg-civic/10 hover:text-civic"><Info className="h-4 w-4" />عن الهيئة</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,820px)_minmax(280px,360px)] lg:justify-center">
        <section id="profile-posts" className="min-w-0 scroll-mt-24">
          <h2 className="sr-only">آخر تحديثات الهيئة</h2>
          {timeline.length > 0 ? (
            <div className="space-y-4">
              {timeline.map((entry) =>
                entry.type === "post" ? (
                  <PostCard key={`post-${entry.item._id}`} post={entry.item} />
                ) : entry.type === "poll" ? (
                  <PollCard key={`poll-${entry.item._id}`} poll={entry.item} />
                ) : (
                  <SurveyFeedCard key={`survey-${entry.item._id}`} survey={entry.item} />
                )
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="font-black">لا توجد تحديثات منشورة حاليًا.</h2>
              <p className="mt-2 text-sm text-ink/60">عند نشر محتوى جديد سيظهر هنا مباشرة.</p>
            </div>
          )}
        </section>

        <aside id="authority-info" className="min-w-0 scroll-mt-24 space-y-4 lg:sticky lg:top-24">
          <ProfileAccordionCard title={<I18nText id="iec.about" />} defaultOpen>
            <p className="leading-8 text-ink/75"><LocalizedValue item={authority} baseKey="description" /></p>
          </ProfileAccordionCard>

          <ProfileAccordionCard title={<I18nText id="iec.officialContact" />}>
            <div className="grid gap-4 text-sm">
              {contact.website ? <Link href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-bold text-civic"><Globe className="h-5 w-5" /><span className="min-w-0 break-all">الموقع الرسمي</span></Link> : null}
              {contact.email ? <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-civic"><Mail className="h-5 w-5" /><span className="min-w-0 break-all">{contact.email}</span></a> : null}
              {contact.nationalCallCenter ? <a href={`tel:${contact.nationalCallCenter}`} className="flex items-center gap-3 text-civic"><Phone className="h-5 w-5" />{contact.nationalCallCenter}</a> : null}
              {contact.poBox ? <p className="flex items-center gap-3"><Building2 className="h-5 w-5 text-civic" />صندوق البريد: {contact.poBox}</p> : null}
              {!contact.website && !contact.email && !contact.nationalCallCenter && !contact.poBox ? <p className="text-ink/60"><I18nText id="common.notAvailable" /></p> : null}
            </div>
          </ProfileAccordionCard>

          <ProfileAccordionCard title={<I18nText id="iec.visionMission" />}>
            {authority.vision ? <div className="mb-4"><h3 className="font-bold"><I18nText id="iec.vision" /></h3><p className="mt-2 leading-7 text-ink/75"><LocalizedValue item={authority} baseKey="vision" /></p></div> : null}
            {authority.mission ? <div><h3 className="font-bold"><I18nText id="iec.mission" /></h3><p className="mt-2 leading-7 text-ink/75"><LocalizedValue item={authority} baseKey="mission" /></p></div> : null}
          </ProfileAccordionCard>

          {(authority.goals || []).length > 0 ? (
            <ProfileAccordionCard title={<I18nText id="iec.goals" />}>
              <ul className="grid gap-2 text-ink/75">{authority.goals.map((goal: string) => <li key={goal} className="flex items-start gap-2 text-sm leading-7"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-civic" />{goal}</li>)}</ul>
            </ProfileAccordionCard>
          ) : null}

          <ProfileAccordionCard title={<I18nText id="iec.officialLinks" />}>
            <div className="grid gap-2">
              {allOfficialLinks.map((link: any) => <Link key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-line px-3 text-sm font-bold text-civic hover:border-civic"><span>{link.label}</span><ArrowRight className="h-4 w-4" /></Link>)}
              {socialLinks.facebook ? <Link href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-xl border border-line px-3 text-sm font-bold text-civic hover:border-civic">فيسبوك</Link> : null}
              {socialLinks.x ? <Link href={socialLinks.x} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-xl border border-line px-3 text-sm font-bold text-civic hover:border-civic">منصة إكس</Link> : null}
              {socialLinks.instagram ? <Link href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-xl border border-line px-3 text-sm font-bold text-civic hover:border-civic">إنستغرام</Link> : null}
              {socialLinks.youtube ? <Link href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-xl border border-line px-3 text-sm font-bold text-civic hover:border-civic">يوتيوب</Link> : null}
              {allOfficialLinks.length === 0 && !socialLinks.facebook && !socialLinks.x && !socialLinks.instagram && !socialLinks.youtube ? <p className="text-ink/60"><I18nText id="common.notAvailable" /></p> : null}
            </div>
          </ProfileAccordionCard>

          <ProfileAccordionCard title={<I18nText id="iec.source" />}>
            <p className="leading-7 text-ink/70">{authority.source?.sourceName || "الموقع الرسمي للهيئة"}</p>
            {authority.source?.sourceUrl ? <Link href={authority.source.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 font-bold text-civic">عرض المصدر الرسمي<ExternalLink className="h-4 w-4" /></Link> : null}
            {authority.source?.sourceCheckedAt ? <p className="mt-3 text-sm text-ink/60"><I18nText id="common.lastVerified" /> {new Date(authority.source.sourceCheckedAt).toLocaleDateString("ar-JO")}</p> : null}
          </ProfileAccordionCard>
        </aside>
      </div>
    </main>
  );
}
