import Link from "next/link";
import Image from "next/image";
import { BookOpen, Building2, Megaphone, MessageCircle } from "lucide-react";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import { getHomeData } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomeData();
  const cards = [
    { href: "/parties", label: "الأحزاب", icon: Building2, text: "بوابة منظمة للتعرف على الأحزاب النشطة بدون ترتيب شعبي أو توصية." },
    { href: "/updates", label: "المستجدات", icon: Megaphone, text: "منشورات وتصويتات عامة من الأحزاب والهيئة في تغذية موحدة." },
    { href: "/laws", label: "افهم قانونك", icon: BookOpen, text: "شرح مبسط للقوانين والمفاهيم الانتخابية مع مصادر وروابط رسمية." },
    { href: "/chat", label: "المساعد الذكي", icon: MessageCircle, text: "مساعد توعوي محايد يرفض ترشيح الأحزاب أو توجيه التصويت." }
  ];

  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-line bg-ink text-white">
        <Image src="/images/sharek-hero.png" alt="" fill priority sizes="100vw" className="absolute inset-0 -z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(23,33,43,.88)_0%,rgba(23,33,43,.66)_43%,rgba(23,33,43,.2)_100%)]" />
        <div className="container-page flex min-h-[560px] flex-col justify-center py-14">
          <div className="max-w-3xl">
            <p className="mb-3 font-semibold text-white/85">Sharek / شارك</p>
            <h1 className="text-4xl font-black leading-[1.25] md:text-6xl">منصة رقمية محايدة لتعزيز المشاركة السياسية</h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-white/82">
              شارك هو جسر رقمي محايد بين المواطن والأحزاب والهيئة المستقلة، يرفع الوعي السياسي، يسهل فهم القوانين، ويمنح الشباب مساحة آمنة ومنظمة للتفاعل وصناعة الرأي العام.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/parties" className="rounded bg-civic px-6 py-3 font-semibold text-white shadow-soft">
                ابدأ المشاركة
              </Link>
              <Link href="/laws" className="rounded border border-white/70 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur">
                افهم قانونك
              </Link>
            </div>
            <div className="mt-6 max-w-xl rounded border border-white/20 bg-white/12 p-4 text-sm leading-7 text-white/86 backdrop-blur">
              المنصة لا ترشح ولا تفضل أي حزب.
            </div>
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded border border-white/20 bg-white/12 p-4 backdrop-blur">
              <span className="block text-3xl font-black">{data.partiesCount}</span>
              <span className="text-sm text-white/75">أحزاب تجريبية</span>
            </div>
            <div className="rounded border border-white/20 bg-white/12 p-4 backdrop-blur">
              <span className="block text-3xl font-black">{data.lawsCount}</span>
              <span className="text-sm text-white/75">مواد قانونية</span>
            </div>
            <div className="rounded border border-white/20 bg-white/12 p-4 backdrop-blur">
              <span className="block text-3xl font-black">{data.updatesCount}</span>
              <span className="text-sm text-white/75">مستجدات منشورة</span>
            </div>
          </div>
        </div>
      </section>
      <section className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="card p-5 hover:border-civic">
                <Icon className="mb-4 h-7 w-7 text-civic" />
                <h2 className="font-bold">{card.label}</h2>
                <p className="mt-3 text-sm leading-7 text-ink/70">{card.text}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="container-page grid gap-6 pb-14 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold">أحدث المنشورات</h2>
          <div className="grid gap-4">{(data.latestPosts as any[]).map((post) => <PostCard key={post._id} post={post} compact />)}</div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">تصويتات نشطة</h2>
          <div className="grid gap-4">{(data.latestPolls as any[]).map((poll) => <PollCard key={poll._id} poll={poll} compact />)}</div>
        </div>
      </section>
    </main>
  );
}
