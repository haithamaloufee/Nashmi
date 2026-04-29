import Link from "next/link";
import { ArrowRight, Globe, Mail, Phone, ShieldCheck, Building2, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";
import { getAuthorityProfileBySlug } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function IecPage() {
  const authority = (await getAuthorityProfileBySlug("independent-election-commission")) as any;
  if (!authority) notFound();

  const contact = authority.contact || {};
  const socialLinks = authority.socialLinks || {};
  const officialLinks = authority.officialLinks || [];
  const mediaUrl = typeof authority.logoMediaId === "object" && authority.logoMediaId ? authority.logoMediaId.url : null;
  const logoUrl = normalizeSafeImageUrl(mediaUrl, { localPrefixes: ["/images/", "/uploads/"] }) || normalizeSafeImageUrl(authority.logoUrl, { localPrefixes: ["/images/"] });
  const logoFallback = <div className="grid h-20 w-20 shrink-0 place-items-center rounded bg-civic text-2xl font-black text-white">هـ</div>;

  const linkItems = [
    { label: "رابط سجل الأحزاب", url: contact.partyRegistryUrl },
    { label: "منصة الأحزاب السياسية", url: contact.partiesPlatformUrl },
    { label: "منصة التدريب جاهز", url: contact.trainingPlatformUrl }
  ].filter((item) => item.url);

  return (
    <main className="container-page py-8">
      <section className="mb-8 rounded border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <SafeImage src={logoUrl} alt={authority.name} className="h-20 w-20 shrink-0 rounded bg-white object-contain ring-1 ring-line" fallback={logoFallback} />
            <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-civic/10 px-3 py-1 text-sm text-civic">
              <ShieldCheck className="h-4 w-4" /> الهيئة المستقلة
            </div>
            <h1 className="text-3xl font-black">{authority.name}</h1>
            <p className="mt-3 max-w-4xl leading-8 text-ink/75">{authority.shortDescription}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-ink/70">
            {authority.establishedYear ? <span>منشأة عام {authority.establishedYear}</span> : null}
            {authority.status ? <span>الحالة: {authority.status}</span> : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xl font-bold">من نحن</h2>
            <p className="text-ink/75 leading-8">{authority.description}</p>
          </div>
          <div className="grid gap-4 rounded border border-line bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">الموقع الرسمي</p>
                {contact.website ? (
                  <Link href={contact.website} target="_blank" rel="noopener noreferrer" className="text-civic">
                    {contact.website}
                  </Link>
                ) : (
                  <p className="text-ink/60">غير متوفر حاليًا</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">البريد الإلكتروني</p>
                {contact.email ? <a href={`mailto:${contact.email}`} className="text-civic">{contact.email}</a> : <p className="text-ink/60">غير متوفر حاليًا</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">المركز الوطني الموحد</p>
                {contact.nationalCallCenter ? <a href={`tel:${contact.nationalCallCenter}`} className="text-civic">{contact.nationalCallCenter}</a> : <p className="text-ink/60">غير متوفر حاليًا</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-civic" />
              <div>
                <p className="text-sm font-semibold">صندوق البريد</p>
                {contact.poBox ? <p>{contact.poBox}</p> : <p className="text-ink/60">غير متوفر حاليًا</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">الرؤية والرسالة</h2>
            {authority.vision ? <div className="mb-4"><h3 className="font-semibold">الرؤية</h3><p className="mt-2 text-ink/75 leading-7">{authority.vision}</p></div> : null}
            {authority.mission ? <div><h3 className="font-semibold">الرسالة</h3><p className="mt-2 text-ink/75 leading-7">{authority.mission}</p></div> : null}
          </div>

          <div className="rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">الأهداف</h2>
            <ul className="grid gap-2 text-ink/75">
              {(authority.goals || []).length > 0 ? (
                authority.goals.map((goal: string) => (
                  <li key={goal} className="flex items-start gap-2 text-sm leading-7">
                    <CheckCircle2 className="mt-1 h-4 w-4 text-civic" />
                    {goal}
                  </li>
                ))
              ) : (
                <p className="text-ink/60">لا توجد أهداف مُدرجة حالياً.</p>
              )}
            </ul>
          </div>

          <div className="rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">روابط رسمية</h2>
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
              {officialLinks.length === 0 && linkItems.length === 0 ? <p className="text-ink/60">لا توجد روابط رسمية متاحة حالياً.</p> : null}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">روابط التواصل والوثائق</h2>
            <div className="grid gap-2">
              {socialLinks.website ? (
                <Link href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">الموقع الرسمي</Link>
              ) : null}
              {socialLinks.facebook ? (
                <Link href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">فيسبوك</Link>
              ) : null}
              {socialLinks.x ? (
                <Link href={socialLinks.x} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">X</Link>
              ) : null}
              {socialLinks.instagram ? (
                <Link href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">إنستغرام</Link>
              ) : null}
              {socialLinks.youtube ? (
                <Link href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="rounded border border-line px-4 py-3 text-sm text-civic">يوتيوب</Link>
              ) : null}
              {!socialLinks.website && !socialLinks.facebook && !socialLinks.x && !socialLinks.instagram && !socialLinks.youtube ? (
                <p className="text-ink/60">لم تُدرج روابط اجتماعية رسمية بعد.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded border border-line bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">مصدر المعلومات</h2>
            <p className="text-ink/70 leading-7">{authority.source?.sourceName || "الموقع الرسمي للهيئة"}</p>
            {authority.source?.sourceUrl ? (
              <Link href={authority.source.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-civic">
                عرض المصدر الرسمي
              </Link>
            ) : null}
            {authority.source?.sourceCheckedAt ? <p className="mt-3 text-sm text-ink/60">آخر تحقق: {new Date(authority.source.sourceCheckedAt).toLocaleDateString("ar-EG")}</p> : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
