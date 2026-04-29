import { notFound } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import FollowButton from "@/components/parties/FollowButton";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import ReportButton from "@/components/reports/ReportButton";
import PartyVerificationActions from "@/components/admin/PartyVerificationActions";
import Alert from "@/components/ui/Alert";
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
  return normalizeSafeImageUrl(mediaUrl, { localPrefixes: ["/images/", "/uploads/"] }) || normalizeSafeImageUrl(party.logoUrl, { localPrefixes: ["/images/"] });
}

function ContactButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-civic hover:text-civic">
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
  const { party, posts, polls, isFollowing } = data;

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

  return (
    <main className="container-page py-8">
      <section className="card overflow-hidden">
        <div className="h-44 bg-[linear-gradient(135deg,#126b6f,#e8eee7)]" />
        <div className="p-6">
          <SafeImage src={getPartyLogoSrc(party)} alt={party.name} className="-mt-16 mb-4 h-24 w-24 rounded border-4 border-white bg-white object-contain shadow-sm" fallback={logoFallback} />
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h1 className="text-3xl font-black">{party.name}</h1>
              <p className="mt-3 max-w-3xl leading-8 text-ink/75">{party.shortDescription}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <FollowButton partyId={party._id} initialFollowed={isFollowing} />
              <ReportButton targetType="party" targetId={party._id} />
              <PartyVerificationActions partyId={party._id} initialVerified={party.isVerified} />
            </div>
          </div>
          <div className="mt-6">
            <Alert>عرض معلومات الحزب هنا للتوعية فقط. شارك لا تقارن ولا ترشح ولا تفضل أي حزب.</Alert>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded border border-line bg-slate-50 p-5">
              <h2 className="mb-4 text-xl font-bold">نظرة عامة</h2>
              <p className="text-ink/75 leading-8">{party.description}</p>
              <div className="mt-6 grid gap-3 text-sm text-ink/70">
                {party.foundedYear ? <p><strong>سنة التأسيس:</strong> {party.foundedYear}</p> : null}
                {party.officialRegistry?.foundingOrConferenceDate ? <p><strong>تاريخ المؤتمر/التأسيس:</strong> {new Date(party.officialRegistry.foundingOrConferenceDate).toLocaleDateString("ar-EG")}</p> : null}
                {party.officialRegistry?.nationalNumber ? <p><strong>الرقم الوطني:</strong> {party.officialRegistry.nationalNumber}</p> : null}
                {party.officialRegistry?.secretaryGeneral ? <p><strong>الأمين العام:</strong> {party.officialRegistry.secretaryGeneral}</p> : null}
              </div>
            </div>
            <div className="rounded border border-line bg-slate-50 p-5">
              <h2 className="mb-4 text-xl font-bold">الرؤية والأهداف</h2>
              <div>
                <p className="text-ink/75 leading-8">{party.vision}</p>
              </div>
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">الأهداف</h3>
                {Array.isArray(party.goals) && party.goals.length > 0 ? (
                  <ul className="list-inside list-disc space-y-2 text-ink/70">
                    {party.goals.map((goal: string) => <li key={goal}>{goal}</li>)}
                  </ul>
                ) : (
                  <p className="text-ink/60">لم يتم إدخال أهداف الحزب بعد.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded border border-line bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">تواصل مع الحزب</h2>
              <div className="grid gap-3">
                {websiteUrl ? <ContactButton href={websiteUrl} label="الموقع الرسمي" /> : null}
                {facebookUrl ? <ContactButton href={facebookUrl} label="فيسبوك" /> : null}
                {xUrl ? <ContactButton href={xUrl} label="X" /> : null}
                {instagramUrl ? <ContactButton href={instagramUrl} label="إنستغرام" /> : null}
                {youtubeUrl ? <ContactButton href={youtubeUrl} label="يوتيوب" /> : null}
                {email ? <ContactButton href={`mailto:${email}`} label="البريد الإلكتروني" /> : null}
                {phone ? <ContactButton href={`tel:${phone}`} label={`هاتف ${phone}`} /> : null}
                {!websiteUrl && !facebookUrl && !xUrl && !instagramUrl && !youtubeUrl && !email && !phone ? (
                  <p className="text-ink/60">لا توجد بيانات اتصال إضافية متاحة حالياً.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded border border-line bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">المقر والفروع</h2>
              <div className="space-y-3 text-ink/75">
                {party.contact?.headquarters ? <p><strong>المقر الرئيسي:</strong> {party.contact.headquarters}</p> : <p className="text-ink/60">لم يتم إدخال مقر رئيسي بعد.</p>}
                <div>
                  <h3 className="mb-2 font-semibold">الفروع</h3>
                  {branches.length > 0 ? (
                    <ul className="list-inside list-disc space-y-2">
                      {branches.map((branch: string) => <li key={branch}>{branch}</li>)}
                    </ul>
                  ) : (
                    <p className="text-ink/60">لم يتم إدخال بيانات الفروع بعد.</p>)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded border border-line bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">الإحصائيات</h2>
              <div className="grid gap-3 text-ink/75">
                {party.statistics?.membersCount != null ? <p><strong>عدد المنتسبين:</strong> {party.statistics.membersCount}</p> : null}
                {party.statistics?.womenMembersCount != null ? <p><strong>العضوات:</strong> {party.statistics.womenMembersCount}</p> : null}
                {party.statistics?.youthMembersCount != null ? <p><strong>الشباب:</strong> {party.statistics.youthMembersCount}</p> : null}
                {party.statistics?.menMembersCount != null ? <p><strong>الرجال:</strong> {party.statistics.menMembersCount}</p> : null}
                {party.statistics?.branchesCount != null ? <p><strong>عدد الفروع:</strong> {party.statistics.branchesCount}</p> : null}
                {party.statistics?.statisticsNote ? <p className="text-sm text-ink/60">{party.statistics.statisticsNote}</p> : null}
                {party.statistics?.membersCount == null && party.statistics?.womenMembersCount == null && party.statistics?.youthMembersCount == null && party.statistics?.menMembersCount == null && party.statistics?.branchesCount == null ? (
                  <p className="text-ink/60">لا توجد إحصائيات موثقة متاحة حالياً.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded border border-line bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">جودة البيانات</h2>
              <div className="space-y-3 text-ink/75">
                <p>{party.dataQuality?.registryDataVerified ? "بيانات التسجيل مثبتة من السجل الرسمي." : "التحقق من بيانات التسجيل ما زال قيد المراجعة."}</p>
                <p>{party.dataQuality?.officialWebsiteVerified ? "الموقع الرسمي موثق." : "الموقع الرسمي لم يُوثق بعد."}</p>
                <p>{party.dataQuality?.socialLinksNeedManualVerification ? "روابط التواصل تحتاج تحققًا يدويًا." : "روابط التواصل يمكن الاعتماد عليها."}</p>
                <p>{party.dataQuality?.statisticsNeedManualVerification ? "الإحصائيات تحتاج تحققًا يدويًا." : "الإحصائيات موثقة."}</p>
                <p>{party.dataQuality?.imagesDeferred ? "صور الحزب مؤجلة وتضاف لاحقاً من لوحة الإدارة." : "صور الحزب متاحة."}</p>
                {party.officialRegistry?.registryUrl ? (
                  <p className="text-sm text-ink/60">مصدر التسجيل: <a href={party.officialRegistry.registryUrl} target="_blank" rel="noopener noreferrer" className="text-civic">رابط السجل الرسمي</a></p>
                ) : null}
                {party.officialRegistry?.sourceCheckedAt ? <p className="text-sm text-ink/60">آخر تحقق: {new Date(party.officialRegistry.sourceCheckedAt).toLocaleDateString("ar-EG")}</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">اللجان</h2>
            {committees.length > 0 ? (
              <div className="space-y-4">
                {committees.map((committee: any) => (
                  <div key={committee.name} className="rounded border border-line p-4">
                    <h3 className="font-semibold">{committee.name}</h3>
                    {committee.description ? <p className="mt-2 text-ink/75">{committee.description}</p> : null}
                    {Array.isArray(committee.members) && committee.members.length > 0 ? <p className="mt-2 text-sm text-ink/60">الأعضاء: {committee.members.join("، ")}</p> : null}
                    {committee.contact ? <p className="mt-2 text-sm text-ink/60">تواصل اللجنة: {committee.contact}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink/60">لم يتم إدخال بيانات اللجان بعد.</p>
            )}
          </div>

          <div className="mt-8 rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">آخر الإنجازات</h2>
            {achievements.length > 0 ? (
              <div className="space-y-4">
                {achievements.map((achievement: any) => (
                  <div key={achievement.title} className="rounded border border-line p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles className="h-4 w-4 text-civic" />{achievement.title}</div>
                    {achievement.date ? <p className="text-sm text-ink/60">{new Date(achievement.date).toLocaleDateString("ar-EG")}</p> : null}
                    {achievement.description ? <p className="mt-2 text-ink/75">{achievement.description}</p> : null}
                    {achievement.sourceUrl ? (
                      <a href={achievement.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-civic text-sm">
                        مصدر
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink/60">لا توجد إنجازات مضافة حتى الآن.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold">منشورات الحزب</h2>
          <div className="grid gap-4">{posts.map((post: any) => <PostCard key={post._id} post={post} />)}</div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">تصويتات الحزب</h2>
          <div className="grid gap-4">{polls.map((poll: any) => <PollCard key={poll._id} poll={poll} />)}</div>
        </div>
      </section>
    </main>
  );
}
