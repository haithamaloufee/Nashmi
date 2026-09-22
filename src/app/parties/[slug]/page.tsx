import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, Info, Newspaper, Sparkles } from "lucide-react";
import FollowButton from "@/components/parties/FollowButton";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import SurveyFeedCard from "@/components/surveys/SurveyFeedCard";
import { ProfileAccordionCard, ProfileTopScrollReset } from "@/components/profile/ProfileInteractions";
import ReportButton from "@/components/reports/ReportButton";
import PartyVerificationActions from "@/components/admin/PartyVerificationActions";
import SafeImage from "@/components/ui/SafeImage";
import { getCurrentUser } from "@/lib/auth";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";
import { getPartyBySlug } from "@/lib/serverData";

export const dynamic = "force-dynamic";

function safeUrl(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getPartyLogoSrc(party: any) {
  const mediaUrl = typeof party.logoMediaId === "object" && party.logoMediaId ? party.logoMediaId.url : null;
  return normalizeSafeImageUrl(mediaUrl, { localPrefixes: ["/images/", "/uploads/"] }) || normalizeSafeImageUrl(party.logoUrl, { localPrefixes: ["/images/", "/uploads/"] });
}

function getPartyCoverSrc(party: any) {
  const mediaUrl = typeof party.coverMediaId === "object" && party.coverMediaId ? party.coverMediaId.url : null;
  return normalizeSafeImageUrl(mediaUrl, { localPrefixes: ["/images/", "/uploads/"] }) || normalizeSafeImageUrl(party.coverUrl, { localPrefixes: ["/images/", "/uploads/"] });
}

type PartyTimelineItem = {
  type: "post" | "poll" | "survey";
  publishedAt: string | null;
  item: any;
};

function timestamp(value: unknown) {
  const time = new Date(value instanceof Date || typeof value === "string" || typeof value === "number" ? value : 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function ContactButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <ExternalLink className="h-4 w-4" />
      {label}
    </a>
  );
}

export default async function PartyDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const data = (await getPartyBySlug(slug, user?.id)) as any;
  if (!data) notFound();
  const { party, posts, polls, surveys = [], isFollowing } = data;
  const partyTimeline: PartyTimelineItem[] = [
    ...posts.map((post: any) => ({ type: "post" as const, publishedAt: post.publishedAt || post.createdAt || null, item: post })),
    ...polls.map((poll: any) => ({ type: "poll" as const, publishedAt: poll.publishedAt || poll.createdAt || null, item: poll })),
    ...surveys.map((survey: any) => ({ type: "survey" as const, publishedAt: survey.publishedAt || survey.createdAt || null, item: survey }))
  ].sort((a, b) => timestamp(b.publishedAt) - timestamp(a.publishedAt));

  const websiteUrl = safeUrl(party.socialLinks?.website || party.contact?.website || party.officialRegistry?.registryUrl);
  const facebookUrl = safeUrl(party.socialLinks?.facebook);
  const xUrl = safeUrl(party.socialLinks?.x);
  const instagramUrl = safeUrl(party.socialLinks?.instagram);
  const youtubeUrl = safeUrl(party.socialLinks?.youtube);
  const email = safeUrl(party.contact?.email || party.contactEmail);
  const phone = Array.isArray(party.contact?.phones) && party.contact.phones.length > 0 ? party.contact.phones[0] : null;
  const branches = Array.isArray(party.contact?.branches) ? party.contact.branches : [];
  const committees = Array.isArray(party.committees) ? party.committees : [];
  const achievements = Array.isArray(party.latestAchievements) ? party.latestAchievements : [];
  const logoFallback = <div className="-mt-16 mb-4 grid h-24 w-24 place-items-center rounded border-4 border-white bg-civic text-4xl font-black text-white">{party.name.slice(0, 1)}</div>;
  const coverUrl = getPartyCoverSrc(party);

  return (
    <main className="pb-12">
      <ProfileTopScrollReset />

      <section className="border-b border-line bg-white/70 pt-5 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="container-page">
          <div className="overflow-hidden rounded-t-3xl border border-b-0 border-line bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {coverUrl ? (
              <SafeImage src={coverUrl} alt={`غلاف ${party.name}`} className="h-44 w-full object-cover sm:h-56 lg:h-64" fallback={<div className="h-44 bg-[linear-gradient(135deg,#126b6f,#dcebe5)] sm:h-56 lg:h-64" />} localPrefixes={["/images/", "/uploads/"]} />
            ) : (
              <div className="h-44 bg-[linear-gradient(135deg,#126b6f,#dcebe5)] sm:h-56 lg:h-64" />
            )}

            <div className="px-4 pb-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
                  <SafeImage src={getPartyLogoSrc(party)} alt={party.name} className="-mt-14 h-28 w-28 shrink-0 rounded-2xl border-4 border-white bg-white object-contain p-1 shadow-md dark:border-slate-950" fallback={logoFallback} />
                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-black sm:text-3xl">{party.name}</h1>
                      {party.isVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-civic/10 px-2.5 py-1 text-xs font-bold text-civic dark:bg-emerald-200/10 dark:text-emerald-100"><BadgeCheck className="h-4 w-4" />حزب موثق</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pb-1">
                  <FollowButton partyId={party._id} initialFollowed={isFollowing} />
                  <ReportButton targetType="party" targetId={party._id} />
                  <PartyVerificationActions partyId={party._id} initialVerified={party.isVerified} />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1 border-t border-line pt-2 text-sm font-bold dark:border-slate-800" aria-label="أقسام صفحة الحزب">
                <a href="#profile-posts" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-civic/10 px-4 text-civic hover:bg-civic hover:text-white"><Newspaper className="h-4 w-4" />آخر التحديثات</a>
                <a href="#party-info" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-ink/65 hover:bg-civic/10 hover:text-civic"><Info className="h-4 w-4" />معلومات الحزب</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page mt-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,820px)_minmax(280px,360px)] lg:justify-center">
          <section id="profile-posts" className="min-w-0 scroll-mt-24">
            <h2 className="sr-only">آخر تحديثات الحزب</h2>

            {partyTimeline.length > 0 ? (
              <div className="space-y-4">
                {partyTimeline.map((entry) =>
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

          <aside id="party-info" className="min-w-0 scroll-mt-24 space-y-4 lg:sticky lg:top-24">
            <ProfileAccordionCard title="نبذة عن الحزب" defaultOpen>
              <p className="leading-8 text-ink/75">{party.description}</p>
              <div className="mt-5 grid gap-2 text-sm text-ink/70">
                {party.foundedYear ? <p><strong>سنة التأسيس:</strong> {party.foundedYear}</p> : null}
                {party.officialRegistry?.foundingOrConferenceDate ? <p><strong>تاريخ المؤتمر أو التأسيس:</strong> {new Date(party.officialRegistry.foundingOrConferenceDate).toLocaleDateString("ar-JO")}</p> : null}
                {party.officialRegistry?.secretaryGeneral ? <p><strong>الأمين العام:</strong> {party.officialRegistry.secretaryGeneral}</p> : null}
              </div>
            </ProfileAccordionCard>

            <ProfileAccordionCard title="الرؤية والأهداف">
              <p className="leading-8 text-ink/75">{party.vision}</p>
              <h3 className="mb-2 mt-4 font-bold">الأهداف</h3>
              {Array.isArray(party.goals) && party.goals.length > 0 ? (
                <ul className="list-inside list-disc space-y-2 text-sm leading-7 text-ink/70">{party.goals.map((goal: string) => <li key={goal}>{goal}</li>)}</ul>
              ) : <p className="text-sm text-ink/60">لا توجد أهداف منشورة حاليًا.</p>}
            </ProfileAccordionCard>

            <ProfileAccordionCard title="تواصل مع الحزب">
              <div className="grid gap-2">
                {websiteUrl ? <ContactButton href={websiteUrl} label="الموقع الرسمي" /> : null}
                {facebookUrl ? <ContactButton href={facebookUrl} label="فيسبوك" /> : null}
                {xUrl ? <ContactButton href={xUrl} label="منصة إكس" /> : null}
                {instagramUrl ? <ContactButton href={instagramUrl} label="إنستغرام" /> : null}
                {youtubeUrl ? <ContactButton href={youtubeUrl} label="يوتيوب" /> : null}
                {email ? <ContactButton href={`mailto:${email}`} label="البريد الإلكتروني" /> : null}
                {phone ? <ContactButton href={`tel:${phone}`} label={`هاتف ${phone}`} /> : null}
                {!websiteUrl && !facebookUrl && !xUrl && !instagramUrl && !youtubeUrl && !email && !phone ? <p className="text-sm text-ink/60">لا توجد بيانات اتصال متاحة حاليًا.</p> : null}
              </div>
            </ProfileAccordionCard>

            <ProfileAccordionCard title="المقر والفروع">
              <div className="space-y-3 text-sm leading-7 text-ink/75">
                {party.contact?.headquarters ? <p><strong>المقر الرئيسي:</strong> {party.contact.headquarters}</p> : <p className="text-ink/60">لا توجد معلومات عن المقر حاليًا.</p>}
                {branches.length > 0 ? <ul className="list-inside list-disc space-y-1">{branches.map((branch: string) => <li key={branch}>{branch}</li>)}</ul> : <p className="text-ink/60">لا توجد معلومات عن الفروع حاليًا.</p>}
              </div>
            </ProfileAccordionCard>

            <ProfileAccordionCard title="أرقام ومعلومات">
              <div className="grid gap-2 text-sm text-ink/75">
                {party.statistics?.membersCount != null ? <p><strong>عدد المنتسبين:</strong> {party.statistics.membersCount}</p> : null}
                {party.statistics?.womenMembersCount != null ? <p><strong>العضوات:</strong> {party.statistics.womenMembersCount}</p> : null}
                {party.statistics?.youthMembersCount != null ? <p><strong>الشباب:</strong> {party.statistics.youthMembersCount}</p> : null}
                {party.statistics?.menMembersCount != null ? <p><strong>الرجال:</strong> {party.statistics.menMembersCount}</p> : null}
                {party.statistics?.branchesCount != null ? <p><strong>عدد الفروع:</strong> {party.statistics.branchesCount}</p> : null}
                {party.statistics?.statisticsNote ? <p className="pt-2 text-xs leading-6 text-ink/60">{party.statistics.statisticsNote}</p> : null}
                {party.statistics?.membersCount == null && party.statistics?.womenMembersCount == null && party.statistics?.youthMembersCount == null && party.statistics?.menMembersCount == null && party.statistics?.branchesCount == null ? <p className="text-ink/60">لا توجد أرقام موثقة متاحة حاليًا.</p> : null}
              </div>
            </ProfileAccordionCard>

            {committees.length > 0 ? (
              <ProfileAccordionCard title="اللجان">
                <div className="space-y-3">{committees.map((committee: any) => <div key={committee.name} className="rounded-xl bg-paper p-3 dark:bg-slate-900"><h3 className="font-bold">{committee.name}</h3>{committee.description ? <p className="mt-2 text-sm leading-7 text-ink/70">{committee.description}</p> : null}{Array.isArray(committee.members) && committee.members.length > 0 ? <p className="mt-2 text-xs text-ink/60">الأعضاء: {committee.members.join("، ")}</p> : null}</div>)}</div>
              </ProfileAccordionCard>
            ) : null}

            {achievements.length > 0 ? (
              <ProfileAccordionCard title="آخر الإنجازات">
                <div className="space-y-3">{achievements.map((achievement: any) => <div key={achievement.title} className="rounded-xl bg-paper p-3 dark:bg-slate-900"><h3 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-civic" />{achievement.title}</h3>{achievement.date ? <p className="mt-1 text-xs text-ink/60">{new Date(achievement.date).toLocaleDateString("ar-JO")}</p> : null}{achievement.description ? <p className="mt-2 text-sm leading-7 text-ink/70">{achievement.description}</p> : null}{achievement.sourceUrl ? <a href={achievement.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-civic">المصدر<ExternalLink className="h-4 w-4" /></a> : null}</div>)}</div>
              </ProfileAccordionCard>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
