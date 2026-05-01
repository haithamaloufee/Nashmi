"use client";

import type { CSSProperties } from "react";
import { useId, useState } from "react";
import { BarChart3, FileCheck2, Info, Users, Vote } from "lucide-react";

const electionNumbers = [
  { label: "عدد المقترعين", value: 1638356, icon: Vote },
  { label: "عدد الناخبين", value: 5080858, icon: Users },
  { label: "عدد المقترعين - إناث", value: 783814, icon: FileCheck2 },
  { label: "عدد الناخبين من فئة الشباب", value: 2295706, icon: BarChart3 }
];

const tabs = [
  { key: "turnout", label: "نسب الانتخاب - 2024" },
  { key: "workers", label: "العاملين بالعملية الانتخابية" },
  { key: "candidates", label: "الترشح بالانتخابات" },
  { key: "observers", label: "المراقبين" }
] as const;

const districtPercentages = [
  19.5, 18.29, 21.77, 34.56, 42.83, 40.75, 61.73, 60.22, 21.64, 52.11, 54.75, 47.44, 55.23, 54.19, 38.06, 50.62, 50.84, 61.54
].map((value, index) => ({ label: `الدائرة ${index + 1}`, value }));

const observerStats = [
  { label: "المراقبين المحليين - إناث", value: 37.5 },
  { label: "المراقبين المحليين - ذكور", value: 62.5 },
  { label: "المراقبين الدوليين - إناث", value: 51.7 },
  { label: "المراقبين الدوليين - ذكور", value: 48.3 }
];

const candidateCharts = [
  { title: "نسبة الذين تقدموا بطلبات الترشح حسب الجنس", male: 77, female: 23 },
  { title: "الدائرة الانتخابية العامة", male: 72, female: 28 },
  { title: "الدائرة الانتخابية المحلية", male: 80, female: 20 }
];

const workerCharts = [
  { title: "لجان الانتخاب في الدوائر الانتخابية وعددهم (303)", male: 78, female: 22 },
  { title: "الكوادر المساندة للجان الانتخاب (1153)", male: 61, female: 39 },
  { title: "العاملون يوم الاقتراع وعددهم (49189)", male: 62, female: 38 }
];

type TabKey = (typeof tabs)[number]["key"];

function DonutPanel() {
  return (
    <div className="reveal-on-scroll rounded bg-white p-6 text-ink shadow-soft" data-reveal>
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        {observerStats.map((item) => (
          <article key={item.label} className="text-center">
            <div className="donut-chart donut-chart-sm mx-auto" data-donut-value={item.value}>
              <div className="donut-chart-inner">
                <span data-counter={item.value} data-counter-decimals="1" data-counter-suffix="%">
                  0.0%
                </span>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-black text-ink/82">{item.label}</h3>
          </article>
        ))}
      </div>
    </div>
  );
}

function PiePanel({ charts }: { charts: Array<{ title: string; male: number; female: number }> }) {
  return (
    <div className="reveal-on-scroll rounded bg-white p-5 text-ink shadow-soft" data-reveal>
      <div className="grid gap-5 xl:grid-cols-3">
        {charts.map((chart) => (
          <article key={chart.title} className="rounded border border-line bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-center text-lg font-black leading-7">{chart.title}</h3>
              <span className="mt-1 h-1 w-6 shrink-0 rounded bg-ink/50" aria-hidden="true" />
            </div>
            <div className="grid place-items-center rounded bg-[#f4f8f8] p-4">
              <div
                className="pie-chart"
                style={
                  {
                    "--female-percent": `${chart.female}%`,
                    "--male-percent": `${chart.male}%`
                  } as CSSProperties
                }
                aria-label={`${chart.title}: ذكور ${chart.male}%، إناث ${chart.female}%`}
              >
                <span className="pie-label pie-label-female">٪ إناث: {chart.female.toFixed(1)}</span>
                <span className="pie-label pie-label-male">٪ ذكور: {chart.male.toFixed(1)}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-5 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0b1b45]" />
                ذكور
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#a20f35]" />
                إناث
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function ElectionStatsSection() {
  const [activeTab, setActiveTab] = useState<TabKey>("turnout");
  const tabBaseId = useId();

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

          <div className="mt-8 flex flex-wrap justify-center gap-3" role="tablist" aria-label="تصنيفات الإحصائيات">
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`${tabBaseId}-${tab.key}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${tabBaseId}-${tab.key}-panel`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`focus-ring min-h-12 rounded border px-5 py-2 font-bold transition ${
                    selected ? "border-white bg-white text-civic shadow-soft" : "border-white/35 bg-white/8 text-white hover:bg-white/14"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            {activeTab === "turnout" ? (
              <div id={`${tabBaseId}-turnout-panel`} role="tabpanel" aria-labelledby={`${tabBaseId}-turnout-tab`} className="grid gap-5 lg:grid-cols-[1fr_0.78fr]">
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
            ) : null}

            {activeTab === "workers" ? (
              <div id={`${tabBaseId}-workers-panel`} role="tabpanel" aria-labelledby={`${tabBaseId}-workers-tab`}>
                <PiePanel charts={workerCharts} />
              </div>
            ) : null}

            {activeTab === "candidates" ? (
              <div id={`${tabBaseId}-candidates-panel`} role="tabpanel" aria-labelledby={`${tabBaseId}-candidates-tab`}>
                <PiePanel charts={candidateCharts} />
              </div>
            ) : null}

            {activeTab === "observers" ? (
              <div id={`${tabBaseId}-observers-panel`} role="tabpanel" aria-labelledby={`${tabBaseId}-observers-tab`}>
                <DonutPanel />
              </div>
            ) : null}
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
