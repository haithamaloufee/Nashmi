import type { CSSProperties } from "react";
import { BarChart3, FileCheck2, Info, Users, Vote } from "lucide-react";

const electionNumbers = [
  { label: "عدد المقترعين", value: 1638356, icon: Vote },
  { label: "عدد الناخبين", value: 5080858, icon: Users },
  { label: "عدد المقترعين - إناث", value: 783814, icon: FileCheck2 },
  { label: "عدد الناخبين من فئة الشباب", value: 2295706, icon: BarChart3 }
];

const districtPercentages = [
  19.5, 18.29, 21.77, 34.56, 42.83, 40.75, 61.73, 60.22, 21.64, 52.11, 54.75, 47.44, 55.23, 54.19, 38.06, 50.62, 50.84, 61.54
].map((value, index) => ({ label: `الدائرة ${index + 1}`, value }));

export default function ElectionStatsSection() {
  return (
    <section className="bg-[linear-gradient(135deg,#243f50,#126b6f_58%,#17313a)] py-16 text-white" id="election-2024" aria-labelledby="election-2024-title">
      <div className="container-page">
        <div className="reveal-on-scroll mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end" data-reveal>
          <div>
            <p className="mb-2 text-sm font-bold text-emerald-200">بيانات رسمية مع عرض توضيحي</p>
            <h2 id="election-2024-title" className="text-3xl font-black">أرقام الانتخابات النيابية 2024</h2>
          </div>
          <p className="max-w-2xl leading-8 text-white/76">
            الأرقام المعروضة مستوحاة من بيانات الهيئة المستقلة للانتخاب لعام 2024، ويُستخدم هذا العرض لأغراض توضيحية داخل المشروع التجريبي.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {electionNumbers.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="reveal-on-scroll rounded border border-white/20 bg-white/10 p-5 shadow-soft backdrop-blur transition hover:-translate-y-1 hover:bg-white/15" data-reveal>
                <Icon className="mb-4 h-9 w-9 text-emerald-200" />
                <h3 className="text-lg font-bold text-white/88">{item.label}</h3>
                <p className="mt-4 text-4xl font-black" data-counter={item.value}>
                  0
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-14" aria-labelledby="statistics-tabs-title">
          <div className="reveal-on-scroll text-center" data-reveal>
            <p className="mb-2 text-sm font-bold text-emerald-200">عرض بصري مستوحى من موقع الهيئة</p>
            <h2 id="statistics-tabs-title" className="text-3xl font-black">الإحصائيات</h2>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="rounded border border-white bg-white px-5 py-2 font-bold text-civic shadow-soft">
              نسب الانتخاب - 2024
            </div>
          </div>

          <div className="mt-8">
              <div className="grid gap-5 lg:grid-cols-[1fr_0.78fr]">
                <article className="reveal-on-scroll min-w-0 rounded bg-white p-5 text-ink shadow-soft" data-reveal>
                  <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <h3 className="text-xl font-black">نسبة المقترعين من الناخبين حسب الدائرة الانتخابية</h3>
                    <span className="rounded-full bg-civic/10 px-3 py-1 text-xs font-bold text-civic">قيم توضيحية من الصورة المرجعية</span>
                  </div>
                  <div className="max-w-full overflow-x-auto overscroll-x-contain pb-2" dir="ltr">
                    <div className="election-chart-grid" aria-label="رسم أعمدة لنسب الانتخاب حسب الدائرة">
                      {districtPercentages.map((item) => (
                        <div key={item.label} className="flex min-h-[300px] flex-col items-center justify-end gap-2">
                          <span className="text-xs font-bold text-ink/78">{item.value}</span>
                          <div className="election-bar-track" aria-hidden="true">
                            <div className="election-bar-fill" style={{ "--bar-height": `${item.value}%` } as CSSProperties} />
                          </div>
                          <span className="max-w-16 -rotate-45 whitespace-nowrap text-xs text-ink/70" dir="rtl">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink/68">
                    <span className="h-3 w-3 rounded-full bg-[#0b1b45]" />
                    النسبة
                  </div>
                </article>

                <article className="reveal-on-scroll grid min-h-[420px] place-items-center rounded bg-white p-6 text-ink shadow-soft" data-reveal>
                  <div className="text-center">
                    <div className="donut-chart mx-auto" data-donut-value="32.25">
                      <div className="donut-chart-inner">
                        <span data-counter="32.25" data-counter-decimals="2" data-counter-suffix="%">
                          0.00%
                        </span>
                      </div>
                    </div>
                    <h3 className="mt-6 text-2xl font-black">النسبة الكلية 2024</h3>
                    <p className="mt-3 max-w-sm leading-7 text-ink/65">تمثيل بصري توضيحي للنسبة الكلية كما تظهر في مرجع الإحصائيات.</p>
                  </div>
                </article>
              </div>
          </div>

          <div className="reveal-on-scroll mt-5 flex gap-3 rounded border border-white/18 bg-white/10 p-4 text-sm leading-7 text-white/80 backdrop-blur" data-reveal>
            <Info className="mt-1 h-5 w-5 shrink-0 text-emerald-200" />
            <p>هذا القسم لا ينسب البيانات إلى منصة نشمي ولا يمنحها صفة رسمية؛ للمعلومات الرسمية الكاملة يرجى الرجوع إلى موقع الهيئة المستقلة للانتخاب.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
