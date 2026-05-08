import { BarChart3, Building2, MapPinned, Users } from "lucide-react";
import CountUpNumber from "@/components/ui/CountUpNumber";

const governorateStats = [
  { label: "العاصمة", value: 29.66 },
  { label: "البلقاء", value: 9.3 },
  { label: "الزرقاء", value: 14.33 },
  { label: "مادبا", value: 2.6 },
  { label: "إربد", value: 20.68 },
  { label: "المفرق", value: 5.28 },
  { label: "جرش", value: 3.26 },
  { label: "عجلون", value: 3.55 },
  { label: "الكرك", value: 5.19 },
  { label: "الطفيلة", value: 1.76 },
  { label: "معان", value: 2.04 },
  { label: "العقبة", value: 2.09 }
];

const partyNumbers = [
  { label: "عدد الأحزاب السياسية", value: 32, icon: Building2 },
  { label: "عدد الأعضاء", value: 86625, icon: Users },
  { label: "ذكور", value: 49699, icon: Users },
  { label: "إناث", value: 36926, icon: Users },
  { label: "شباب 18-35", value: 30556, icon: Users },
  { label: "نسبة الذكور", value: 57.37, suffix: "%", decimals: 2, icon: BarChart3 }
];

export default function LandingInsightsSections() {
  return (
    <>
      <section className="bg-slate-50 py-16 dark:bg-[#0b141b]" id="party-insights" aria-labelledby="party-insights-title">
        <div className="container-page grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="reveal-on-scroll" data-reveal>
            <p className="mb-2 text-sm font-bold text-civic dark:text-emerald-200">إحصاءات حزبية</p>
            <h2 id="party-insights-title" className="text-3xl font-black text-slate-950 dark:text-white">نسبة الأعضاء حسب المحافظة</h2>
            <p className="mt-4 max-w-2xl leading-8 text-slate-600 dark:text-slate-300">
              عرض ثابت مستوحى من مرجع إحصاءات الأحزاب: يوضح توزيع أعضاء الأحزاب على المحافظات، مع إبقاء الأرقام توعوية داخل تجربة نشمي.
            </p>

            <div className="mt-7 space-y-3">
              {governorateStats.map((item) => (
                <div key={item.label} className="grid grid-cols-[76px_1fr_64px] items-center gap-3 text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
                    <div className="h-full rounded-full bg-gradient-to-l from-civic to-emerald-300" style={{ width: `${Math.max(item.value, 2)}%` }} />
                  </div>
                  <span className="text-left font-black text-civic dark:text-emerald-200">
                    <CountUpNumber value={item.value} decimals={2} suffix="%" duration={1100} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal-on-scroll rounded border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-950/95" data-reveal>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">عدد الأعضاء - ذكور وإناث</p>
              <p className="mt-2 text-5xl font-black text-civic dark:text-emerald-200">
                <CountUpNumber value={86625} duration={1400} />
              </p>
            </div>
            <div className="mx-auto mt-6 grid aspect-square w-64 max-w-full place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_57.37%,#cbd5e1_57.37%_100%)] p-7 shadow-sm dark:bg-[conic-gradient(#5eead4_0_57.37%,#334155_57.37%_100%)]">
              <div className="grid h-full w-full place-items-center rounded-full bg-white text-center shadow-inner dark:bg-slate-950">
                <Users className="mx-auto mb-2 h-8 w-8 text-civic dark:text-emerald-200" />
                <span className="block text-3xl font-black text-slate-950 dark:text-white">
                  <CountUpNumber value={57.37} decimals={2} suffix="%" duration={1300} />
                </span>
                <span className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">ذكور</span>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/90">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">ذكور</p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white"><CountUpNumber value={49699} duration={1200} /></p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/90">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">إناث</p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white"><CountUpNumber value={36926} duration={1200} /></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#0f172a,#126b6f_58%,#0b141b)] py-12 text-white" id="party-number-strip" aria-labelledby="party-number-strip-title">
        <div className="container-page">
          <div className="reveal-on-scroll mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end" data-reveal>
            <div>
              <p className="mb-2 text-sm font-black text-emerald-200">أرقام من مرجع الأحزاب</p>
              <h2 id="party-number-strip-title" className="text-3xl font-black">الأحزاب السياسية بالأرقام</h2>
            </div>
            <p className="max-w-xl leading-8 text-white/78">الأرقام المعروضة مأخوذة من لقطات المرجع المرفقة وتستخدم كعرض بصري ثابت دون ربط خلفي جديد.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partyNumbers.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="reveal-on-scroll rounded border border-emerald-200/20 bg-white/[0.08] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:bg-white/[0.12] dark:bg-slate-950/35" data-reveal>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Icon className="h-8 w-8 text-emerald-200" />
                    <span className="rounded-full bg-emerald-200/12 px-3 py-1 text-xs font-bold text-emerald-100">Nashmi</span>
                  </div>
                  <p className="text-4xl font-black leading-none">
                    <CountUpNumber value={item.value} decimals={item.decimals} suffix={item.suffix} duration={1300} />
                  </p>
                  <h3 className="mt-3 text-sm font-bold leading-7 text-white/85">{item.label}</h3>
                </article>
              );
            })}
          </div>

          <div className="reveal-on-scroll mt-5 flex gap-3 rounded border border-emerald-200/20 bg-slate-950/25 p-4 text-sm leading-7 text-white/78" data-reveal>
            <MapPinned className="mt-1 h-5 w-5 shrink-0 text-emerald-200" />
            <p>هذا العرض لا ينسب الإحصاءات إلى منصة نشمي؛ هو واجهة توضيحية مستوحاة من مرجع إحصاءات الأحزاب المرفق.</p>
          </div>
        </div>
      </section>
    </>
  );
}
