import { Suspense } from "react";
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
  MessageCircle,
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
import LandingInteractions from "@/components/landing/LandingInteractions";
import RelatedSitesSection from "@/components/landing/RelatedSitesSection";
import RoyalQuotesSection from "@/components/landing/RoyalQuotesSection";
import { HomeStatsSkeleton } from "@/components/ui/Skeletons";
import { getCurrentUser } from "@/lib/auth";
import { getHomeStats } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const valuesCards = [
  {
    title: "الرؤية",
    text: "تعزيز ثقافة المشاركة المدنية الواعية وبناء مساحة رقمية آمنة للحوار والتفاعل.",
    icon: Flag
  },
  {
    title: "الرسالة",
    text: "توفير تجربة رقمية سهلة تساعد المواطنين على متابعة المستجدات، فهم التشريعات، التفاعل مع التصويتات، والتواصل بطريقة مسؤولة.",
    icon: Target
  },
  {
    title: "هدفنا",
    text: "رفع الوعي السياسي والانتخابي وتشجيع الشباب على المشاركة الفاعلة في الحياة العامة.",
    icon: Award
  },
  {
    title: "القيم الجوهرية",
    text: "الشفافية، المسؤولية، الحياد، احترام الرأي الآخر، سهولة الوصول، وحماية المستخدم.",
    icon: ShieldCheck
  }
];

const officialLinks = [
  { label: "الهيئة المستقلة للانتخاب", href: "https://www.iec.jo/ar" },
  { label: "عن الهيئة", href: "https://www.iec.jo/ar/about-us" },
  { label: "التشريعات النافذة", href: "https://www.iec.jo/ar/applicable-legislation" },
  { label: "التقارير والوثائق", href: "https://www.iec.jo/ar/archive/reports-and-documents" },
  { label: "سجل الأحزاب", href: "https://www.iec.jo/ar/party-registry" },
  { label: "اتصل بنا", href: "https://www.iec.jo/ar/contact-us" }
];

const mainLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "آخر المستجدات", href: "/updates" },
  { label: "بوابة الأحزاب", href: "/parties" },
  { label: "افهم قانونك", href: "/laws" },
  { label: "المساعد الذكي", href: "/chat" }
];

function ExternalAnchor({ href, children, className, ariaLabel }: { href: string; children: React.ReactNode; className?: string; ariaLabel?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function formatMetricValue(value: number, available: boolean) {
  return available ? new Intl.NumberFormat("ar-JO").format(value) : "غير متاح";
}

async function PlatformStats() {
  const data = await getHomeStats();
  const dataAvailable = data.available !== false;
  const stats = [
    { label: "عدد المنشورات", value: data.postsCount, icon: Newspaper },
    { label: "عدد التصويتات", value: data.pollsCount, icon: Vote },
    { label: "عدد الأحزاب", value: data.partiesCount, icon: Building2 },
    { label: "عدد التفاعلات", value: data.interactionsCount, icon: MessageCircle },
    { label: "عدد المستخدمين", value: data.usersCount, icon: Users }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="reveal-on-scroll rounded border border-white/20 bg-white/10 p-5 text-white shadow-soft backdrop-blur" data-reveal>
            <Icon className="mb-4 h-8 w-8 text-emerald-200" />
            <span className={`block font-black leading-none text-white drop-shadow-sm ${dataAvailable ? "text-4xl" : "text-2xl"}`}>
              {formatMetricValue(stat.value, dataAvailable)}
            </span>
            <span className="mt-3 block text-sm font-semibold text-white/78">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const showAdminAccess = user?.role === "admin" || user?.role === "super_admin";
  const quickAccessCards = [
    {
      href: "/parties",
      title: "بوابة الأحزاب",
      text: "استعرض الأحزاب النشطة وملفاتها التعريفية ومحتواها المنشور داخل المنصة.",
      icon: Building2
    },
    {
      href: "/updates",
      title: "آخر المستجدات",
      text: "تابع المنشورات والتصويتات العامة في تغذية موحدة وسهلة القراءة.",
      icon: Newspaper
    },
    {
      href: "/chat",
      title: "المساعد الذكي",
      text: "اطرح أسئلة توعوية محايدة حول القوانين والمفاهيم الانتخابية.",
      icon: Bot
    },
    {
      href: "/laws",
      title: "افهم قانونك",
      text: "اقرأ شروحات مبسطة للتشريعات والمفاهيم مع روابط ومصادر واضحة.",
      icon: Scale
    },
    ...(showAdminAccess
      ? [
          {
            href: "/admin",
            title: "لوحة التحكم",
            text: "إدارة المستخدمين والمحتوى والبلاغات ضمن صلاحيات الإدارة.",
            icon: BarChart3
          }
        ]
      : [])
  ];

  return (
    <main id="top">
      <LandingInteractions />

      <section className="relative isolate overflow-hidden border-b border-line bg-ink text-white" aria-labelledby="hero-title">
        <Image src="/images/sharek-hero.png" alt="" fill priority unoptimized sizes="100vw" className="pointer-events-none absolute inset-0 -z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(15,25,33,.92)_0%,rgba(18,107,111,.74)_48%,rgba(15,25,33,.34)_100%)]" />
        <div className="container-page flex min-h-[560px] flex-col justify-center py-16 md:py-20">
          <div className="max-w-3xl text-shadow-sm">
            <p className="mb-5 text-lg font-black text-white">Nashmi / نشمي</p>
            <h1 id="hero-title" className="text-4xl font-black leading-[1.22] md:text-6xl">
              نشمي…  أن تكون حاضرًا حين يُصنع القرار، لا مجرد شاهد عليه.</h1>
            <p className="mt-8 max-w-2xl text-xl leading-10 text-white/90 md:text-2xl md:leading-[2.9rem]">
              نشمي مساحة رقمية محايدة تساعد المواطنين والشباب على فهم المستجدات، متابعة الأحزاب، قراءة التشريعات، والمشاركة في حوار مسؤول دون ترشيح أو تفضيل أي جهة سياسية.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/parties" className="focus-ring rounded bg-civic px-6 py-3 font-semibold text-white shadow-soft hover:bg-civic/90">
                ابدأ المشاركة
              </Link>
              <Link href="/laws" className="focus-ring rounded border border-white/70 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/20">
                افهم قانونك
              </Link>
            </div>
            <div className="mt-6 max-w-xl rounded border border-white/20 bg-white/10 p-4 text-sm leading-7 text-white/86 backdrop-blur">
              المنصة مشروع تجريبي ولا ترشح أو تفضل أي حزب أو مرشح.
            </div>
          </div>
        </div>
      </section>

      <RoyalQuotesSection />

      <section className="container-page py-6" aria-label="تنويه المشروع التجريبي">
        <div className="reveal-on-scroll flex flex-col gap-4 rounded border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm md:flex-row md:items-center md:justify-between" data-reveal>
          <div className="flex gap-3">
            <Info className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
            <p className="leading-8">
              <strong>تنويه:</strong> هذا الموقع مشروع تجريبي تعليمي تم تطويره ضمن هاكاثون/مشروع جامعي، ولا يمثل الموقع الرسمي للهيئة المستقلة للانتخاب أو أي جهة حكومية. للحصول على المعلومات الرسمية يرجى الرجوع إلى موقع الهيئة المستقلة للانتخاب.
            </p>
          </div>
          <ExternalAnchor href="https://www.iec.jo/ar" className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800">
            زيارة الموقع الرسمي للهيئة
            <ExternalLink className="h-4 w-4" />
          </ExternalAnchor>
        </div>
      </section>

      <section className="container-page grid gap-6 py-14 lg:grid-cols-[1fr_0.9fr]" id="about" aria-labelledby="about-title">
        <div className="reveal-on-scroll card p-6 lg:p-8" data-reveal>
          <p className="mb-3 text-sm font-bold text-civic">عن المنصة</p>
          <h2 id="about-title" className="text-3xl font-black">عن منصة نشمي</h2>
          <p className="mt-5 text-lg leading-9 text-ink/75">
            نشمي منصة رقمية تجريبية تهدف إلى تعزيز المشاركة المدنية والسياسية لدى المواطنين، وتسهيل الوصول إلى المعلومات الانتخابية والحزبية، وفتح مساحة تفاعلية للحوار المسؤول بين المواطنين والجهات ذات العلاقة.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/updates" className="focus-ring rounded bg-civic px-5 py-3 font-semibold text-white hover:bg-civic/90">
              استكشف المنصة
            </Link>
            <Link href="/chat" className="focus-ring rounded border border-line px-5 py-3 font-semibold text-civic hover:border-civic hover:bg-civic/5">
              اسأل المساعد
            </Link>
          </div>
        </div>
        <div className="reveal-on-scroll relative min-h-[340px] overflow-hidden rounded border border-line bg-ink shadow-soft" data-reveal>
          <Image src="/images/sharek-hero.png" alt="واجهة رمزية لمنصة نشمي" fill unoptimized sizes="(min-width: 1024px) 44vw, 100vw" className="pointer-events-none object-cover opacity-75" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(23,33,43,.86),rgba(18,107,111,.15))]" />
          <div className="absolute inset-x-5 bottom-5 rounded border border-white/20 bg-white/12 p-5 text-white backdrop-blur">
            <Sparkles className="mb-3 h-7 w-7 text-emerald-200" />
            <p className="text-lg font-bold">تجربة مدنية رقمية بهوية نشمي</p>
            <p className="mt-2 text-sm leading-7 text-white/78">تصميم مستوحى من بنية المواقع الرسمية، مع هوية مستقلة وواضحة كمشروع تعليمي تجريبي.</p>
          </div>
        </div>
      </section>

      <section className="landing-pattern bg-ink py-16 text-white" id="values" aria-labelledby="values-title">
        <div className="container-page">
          <div className="reveal-on-scroll mb-8 max-w-2xl" data-reveal>
            <p className="mb-2 text-sm font-bold text-emerald-200">الرؤية والرسالة</p>
            <h2 id="values-title" className="text-3xl font-black">مبادئ نشمي</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {valuesCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="reveal-on-scroll rounded border border-white/15 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-200/50 hover:bg-white/15 hover:shadow-soft" data-reveal>
                  <Icon className="mb-5 h-10 w-10 text-emerald-200" />
                  <h3 className="text-2xl font-black">{card.title}</h3>
                  <p className="mt-3 leading-8 text-white/78">{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#17313a,#126b6f)] py-16" id="statistics" aria-labelledby="stats-title">
        <div className="container-page">
          <div className="reveal-on-scroll mb-8 flex flex-col justify-between gap-4 text-white md:flex-row md:items-end" data-reveal>
            <div>
              <p className="mb-2 text-sm font-bold text-emerald-200">بيانات المنصة</p>
              <h2 id="stats-title" className="text-3xl font-black">مؤشرات المنصة</h2>
            </div>
            <p className="max-w-xl leading-8 text-white/75">تستند هذه المؤشرات إلى بيانات المنصة الحالية عند توفر قاعدة البيانات، وليست أرقامًا رسمية للانتخابات أو للهيئة.</p>
          </div>
          <Suspense fallback={<HomeStatsSkeleton />}>
            <PlatformStats />
          </Suspense>
        </div>
      </section>

      <ElectionStatsSection />

      <section className="container-page py-14" id="services" aria-labelledby="services-title">
        <div className="reveal-on-scroll mb-8 flex items-end justify-between gap-4" data-reveal>
          <div>
            <p className="mb-2 text-sm font-bold text-civic">وصول سريع</p>
            <h2 id="services-title" className="text-3xl font-black">خدمات وبوابات المنصة</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="reveal-on-scroll card card-hover group p-5 focus-ring" data-reveal>
                <Icon className="mb-4 h-8 w-8 text-civic transition group-hover:scale-110" />
                <h3 className="text-lg font-black">{card.title}</h3>
                <p className="mt-3 min-h-20 text-sm leading-7 text-ink/70">{card.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-civic">
                  فتح المسار
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
              <Image src="/images/nashmi logo.png" alt="شعار منصة نشمي" width={72} height={72} unoptimized className="h-16 w-16 rounded-full bg-white/95 object-contain p-1" />
              <div>
                <h2 id="footer-title" className="text-2xl font-black">نشمي</h2>
                <p className="text-sm text-white/62">Nashmi civic demo</p>
              </div>
            </div>
            <p className="leading-8 text-white/78">منصة نشمي مشروع رقمي تجريبي لتعزيز المشاركة المدنية والوعي الانتخابي.</p>
            <p className="mt-4 rounded border border-white/15 bg-white/[0.08] p-3 text-sm leading-7 text-white/76">هذا المشروع تجريبي ولا يمثل جهة رسمية.</p>
          </section>

          <nav aria-label="روابط نشمي">
            <h3 className="mb-4 text-lg font-black">القائمة الرئيسية</h3>
            <ul className="space-y-3 text-white/78">
              {mainLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="focus-ring hover:text-emerald-200 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="#related" className="focus-ring hover:text-emerald-200 hover:underline">
                  مواقع ذات صلة
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="روابط الهيئة الرسمية">
            <div className="mb-4 flex items-center gap-3">
              <Image src="/related/iec-logo.png" alt="شعار الهيئة المستقلة للانتخاب" width={48} height={48} unoptimized className="h-12 w-12 rounded bg-white object-contain p-1" />
              <h3 className="text-lg font-black">روابط الهيئة الرسمية</h3>
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
            <h3 className="mb-4 text-lg font-black">تنويه واتصال</h3>
            <p className="leading-8 text-white/78">للمعلومات الرسمية يرجى زيارة موقع الهيئة المستقلة للانتخاب. لا تجمع نشمي أي صفة تمثيلية عن الهيئة أو أي جهة حكومية.</p>
            <ExternalAnchor href="https://www.iec.jo/ar" className="focus-ring mt-5 inline-flex items-center gap-2 rounded bg-white px-4 py-2 font-bold text-civic hover:bg-emerald-50">
              الموقع الرسمي للهيئة
              <ExternalLink className="h-4 w-4" />
            </ExternalAnchor>
            <a href="#top" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:border-emerald-200 hover:text-emerald-200" aria-label="العودة إلى أعلى الصفحة">
              <ChevronUp className="h-4 w-4" />
              اذهب للأعلى
            </a>
          </section>
        </div>
        <div className="container-page mt-10 border-t border-white/[0.14] pt-5 text-sm text-white/70">© جميع الحقوق محفوظة لفريق جامعة الطفيلة التقنية</div>
      </footer>
    </main>
  );
}
