import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ExternalLink, Globe, Mail, Phone, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import SurveyCard from "@/components/surveys/SurveyCard";
import { JumpToPostsButton, ProfileAccordionCard } from "@/components/profile/ProfileInteractions";
import SafeImage from "@/components/ui/SafeImage";
import DelayedTooltipBadge from "@/components/ui/DelayedTooltipBadge";
import { I18nText } from "@/components/i18n/LanguageProvider";
import LocalizedValue from "@/components/i18n/LocalizedValue";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";
import { getAuthorityProfilePageData } from "@/lib/serverData";

export const dynamic = "force-dynamic";

function OfficialBadge() {
  return (
    <DelayedTooltipBadge
      tooltip="الهيئة المستقلة للانتخاب جهة رسمية مستقلة وليست حزبًا سياسيًا، ولا تتبع لأي حزب أو جهة حزبية. دورها مرتبط بإدارة العملية الانتخابية والإشراف عليها رسميًا."
      className="inline-flex items-center gap-1 rounded-full bg-civic/10 px-3 py-1 text-xs font-bold text-civic outline-none ring-1 ring-civic/20 focus-visible:ring-2"
      ariaLabel="Official account of the Independent Election Commission"
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

  return (
    <main className="container-page py-8">
      <section className="mb-8 rounded border border-line bg-white p-6 shadow-sm">
        {coverUrl ? (
          <SafeImage src={coverUrl} alt="غلاف الهيئة المستقلة للانتخاب" className="-mx-6 -mt-6 mb-6 h-44 w-[calc(100%+3rem)] rounded-t object-cover" fallback={<div className="-mx-6 -mt-6 mb-6 h-44 w-[calc(100%+3rem)] rounded-t bg-civic/10" />} localPrefixes={["/images/", "/uploads/", "/related/"]} />
        ) : null}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <SafeImage src={logoUrl} alt="شعار الهيئة المستقلة للانتخاب" className="h-20 w-20 shrink-0 rounded bg-white object-contain p-1 ring-1 ring-line" fallback={logoFallback} localPrefixes={["/images/", "/uploads/", "/related/"]} />
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-civic/10 px-3 py-1 text-sm font-bold text-civic">
                <Building2 className="h-4 w-4" />
                <I18nText id="content.independentAuthority" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black">{authority.name}</h1>
                <OfficialBadge />
              </div>
              <p className="mt-3 max-w-4xl leading-8 text-ink/75"><LocalizedValue item={authority} baseKey="shortDescription" /></p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <JumpToPostsButton label={<I18nText id="iec.viewPosts" />} />
            <div className="flex flex-wrap gap-2 text-sm text-ink/70">
              {authority.establishedYear ? <span><I18nText id="iec.established" /> {authority.establishedYear}</span> : null}
              {authority.status ? <span><I18nText id="iec.status" /> {authority.status === "active" ? <I18nText id="iec.status.active" /> : authority.status}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ProfileAccordionCard title={<I18nText id="iec.about" />} defaultOpen>
          <p className="leading-8 text-ink/75"><LocalizedValue item={authority} baseKey="description" /></p>
        </ProfileAccordionCard>

        <ProfileAccordionCard title={<I18nText id="iec.officialContact" />}>
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold"><I18nText id="common.officialWebsite" /></p>
                {contact.website ? <Link href={contact.website} target="_blank" rel="noopener noreferrer" className="text-civic">{contact.website}</Link> : <p className="text-ink/60"><I18nText id="common.notAvailable" /></p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">Email</p>
                {contact.email ? <a href={`mailto:${contact.email}`} className="text-civic">{contact.email}</a> : <p className="text-ink/60"><I18nText id="common.notAvailable" /></p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">المركز الوطني الموحد</p>
                {contact.nationalCallCenter ? <a href={`tel:${contact.nationalCallCenter}`} className="text-civic">{contact.nationalCallCenter}</a> : <p className="text-ink/60"><I18nText id="common.notAvailable" /></p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">صندوق البريد</p>
                {contact.poBox ? <p>{contact.poBox}</p> : <p className="text-ink/60"><I18nText id="common.notAvailable" /></p>}
              </div>
            </div>
          </div>
        </ProfileAccordionCard>

        <ProfileAccordionCard title={<I18nText id="iec.visionMission" />}>
          {authority.vision ? <div className="mb-4"><h3 className="font-semibold"><I18nText id="iec.vision" /></h3><p className="mt-2 leading-7 text-ink/75"><LocalizedValue item={authority} baseKey="vision" /></p></div> : null}
          {authority.mission ? <div><h3 className="font-semibold"><I18nText id="iec.mission" /></h3><p className="mt-2 leading-7 text-ink/75"><LocalizedValue item={authority} baseKey="mission" /></p></div> : null}
        </ProfileAccordionCard>

        <ProfileAccordionCard title={<I18nText id="iec.goals" />}>
          <ul className="grid gap-2 text-ink/75">
            {(authority.goals || []).length > 0 ? (
              authority.goals.map((goal: string) => (
                <li key={goal} className="flex items-start gap-2 text-sm leading-7">
                  <CheckCircle2 className="mt-1 h-4 w-4 text-civic" />
                  {goal}
                </li>
              ))
            ) : (
              <p className="text-ink/60"><I18nText id="common.notAvailable" /></p>
            )}
          </ul>
        </ProfileAccordionCard>

        <ProfileAccordionCard title={<I18nText id="iec.officialLinks" />}>
          <div className="grid gap-3">
            {(officialLinks || []).map((link: any) => (
              <Link key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded border border-line px-4 py-3 text-sm font-medium text-ink transition hover:border-civic hover:text-civic">
                <span>{link.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
            {linkItems.map((item) => (
              <Link key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded border border-line px-4 py-3 text-sm font-medium text-ink transition hover:border-civic hover:text-civic">
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
            {officialLinks.length === 0 && linkItems.length === 0 ? <p className="text-ink/60"><I18nText id="common.notAvailable" /></p> : null}
          </div>
        </ProfileAccordionCard>

        <ProfileAccordionCard title={<I18nText id="iec.contactLinksDocuments" />}>
          <div className="grid gap-2">
            {socialLinks.website ? <Link href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">الموقع الرسمي</Link> : null}
            {socialLinks.facebook ? <Link href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">فيسبوك</Link> : null}
            {socialLinks.x ? <Link href={socialLinks.x} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">X</Link> : null}
            {socialLinks.instagram ? <Link href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">إنستغرام</Link> : null}
            {socialLinks.youtube ? <Link href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">يوتيوب</Link> : null}
            {!socialLinks.website && !socialLinks.facebook && !socialLinks.x && !socialLinks.instagram && !socialLinks.youtube ? <p className="text-ink/60"><I18nText id="common.notAvailable" /></p> : null}
          </div>
        </ProfileAccordionCard>

        <ProfileAccordionCard title={<I18nText id="iec.source" />}>
          <p className="leading-7 text-ink/70">{authority.source?.sourceName || "الموقع الرسمي للهيئة"}</p>
          {authority.source?.sourceUrl ? (
            <Link href={authority.source.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-civic">
              عرض المصدر الرسمي
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
          {authority.source?.sourceCheckedAt ? <p className="mt-3 text-sm text-ink/60"><I18nText id="common.lastVerified" /> {new Date(authority.source.sourceCheckedAt).toLocaleDateString("ar-EG")}</p> : null}
        </ProfileAccordionCard>
      </section>

      <section id="profile-posts" className="scroll-mt-24 mt-8 grid gap-6 xl:grid-cols-3">
        <div>
          <h2 className="mb-4 text-2xl font-bold"><I18nText id="iec.posts" /></h2>
          <div className="grid gap-4">
            {posts.length > 0 ? posts.map((post: any) => <PostCard key={post._id} post={post} />) : <p className="rounded border border-line bg-white p-5 text-ink/60"><I18nText id="iec.noPosts" /></p>}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold"><I18nText id="iec.polls" /></h2>
          <div className="grid gap-4">
            {polls.length > 0 ? polls.map((poll: any) => <PollCard key={poll._id} poll={poll} />) : <p className="rounded border border-line bg-white p-5 text-ink/60"><I18nText id="iec.noPolls" /></p>}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">الاستبيانات</h2>
          <div className="grid gap-4">
            {surveys.length > 0 ? surveys.map((survey: any) => <SurveyCard key={survey._id} survey={survey} compact />) : <p className="rounded border border-line bg-white p-5 text-ink/60">لا توجد استبيانات منشورة حاليًا.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
