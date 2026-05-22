"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, ClipboardList, MessageCircle, Newspaper, Scale, Users } from "lucide-react";
import CountUpNumber from "@/components/ui/CountUpNumber";
import { useTranslation } from "@/components/i18n/LanguageProvider";

type Indicators = {
  citizensCount: number;
  usersCount: number;
  partiesCount: number;
  openPollsCount: number;
  closedPollsCount: number;
  updatesCount: number;
  surveysCount: number;
  surveyResponsesCount: number;
  lawsCount: number;
  participationsCount: number;
};

export default function PlatformIndicatorsSection() {
  const { t } = useTranslation();
  const [data, setData] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/platform/indicators", { cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!json.ok) {
          setFailed(true);
          return;
        }
        setData(json.data);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { key: "usersCount", label: t("indicators.users"), icon: Users },
    { key: "partiesCount", label: t("indicators.parties"), icon: Building2 },
    { key: "updatesCount", label: t("indicators.updates"), icon: Newspaper },
    { key: "surveysCount", label: t("indicators.surveys"), icon: ClipboardList },
    { key: "surveyResponsesCount", label: t("indicators.surveyResponses"), icon: MessageCircle },
    { key: "lawsCount", label: t("indicators.laws"), icon: Scale }
  ] as const;

  return (
    <section className="bg-[linear-gradient(135deg,#14323b,#126b6f)] py-14 text-white" aria-labelledby="platform-indicators-title">
      <div className="container-page">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-200">
              <BarChart3 className="h-4 w-4" />
              {t("indicators.title")}
            </p>
            <h2 id="platform-indicators-title" className="text-3xl font-black">{t("indicators.title")}</h2>
          </div>
          <p className="max-w-xl leading-8 text-white/74">{t("indicators.subtitle")}</p>
        </div>

        {failed ? (
          <div className="rounded border border-white/20 bg-white/10 p-5 text-sm font-semibold text-white/80">{t("common.error")}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              const value = data?.[card.key] ?? 0;
              return (
                <article key={card.key} className="rounded border border-emerald-200/20 bg-white/[0.10] p-5 text-white shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200/55 hover:bg-white/[0.14] dark:bg-slate-950/45 dark:text-white">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Icon className="h-8 w-8 text-emerald-200" />
                    {loading ? <span className="h-3 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" /> : null}
                  </div>
                  <div className="text-4xl font-black leading-none text-white drop-shadow-sm">
                    {loading ? <span className="block h-10 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <CountUpNumber value={value} duration={900} />}
                  </div>
                  <p className="mt-3 text-base font-black text-white/82">{card.label}</p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
