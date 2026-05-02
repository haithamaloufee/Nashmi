"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import quotesData from "@/data/RoyalQuotesData.json";

type RoyalQuote = {
  author: string;
  quote: string;
  image_url: string;
};

const rotationMs = 11000;

function isCrownPrinceQuote(quote: RoyalQuote) {
  return /ولي|الأمير|الحسين بن عبدالله|الحسين بن عبد الله/.test(quote.author) && !quote.author.includes("الملك");
}

function orderQuotes(quotes: RoyalQuote[]) {
  const kingQuotes = quotes.filter((quote) => !isCrownPrinceQuote(quote));
  const crownPrinceQuotes = quotes.filter(isCrownPrinceQuote);
  const ordered: RoyalQuote[] = [];
  const pairs = Math.min(kingQuotes.length, crownPrinceQuotes.length);

  for (let index = 0; index < pairs; index += 1) {
    ordered.push(kingQuotes[index], crownPrinceQuotes[index]);
  }

  return [...ordered, ...kingQuotes.slice(pairs), ...crownPrinceQuotes.slice(pairs)];
}

export default function RoyalQuotesSection() {
  const quotes = useMemo(() => orderQuotes(quotesData as RoyalQuote[]), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [displayedQuote, setDisplayedQuote] = useState("");
  const activeQuote = quotes[activeIndex] || null;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    function updatePreference(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }

    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion || quotes.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % quotes.length);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, [quotes.length, reducedMotion]);

  useEffect(() => {
    if (!activeQuote) return;
    const fullQuote = activeQuote.quote;
    if (reducedMotion) {
      setDisplayedQuote(fullQuote);
      return;
    }

    let cancelled = false;
    let nextLength = 0;
    const chunkSize = Math.max(1, Math.ceil(fullQuote.length / 90));

    setDisplayedQuote("");

    function tick() {
      if (cancelled) return;
      nextLength = Math.min(fullQuote.length, nextLength + chunkSize);
      setDisplayedQuote(fullQuote.slice(0, nextLength));
      if (nextLength < fullQuote.length) {
        window.setTimeout(tick, 12);
      }
    }

    const start = window.setTimeout(tick, 90);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [activeQuote, reducedMotion]);

  if (!activeQuote) return null;

  const imageFailed = failedImages[activeQuote.image_url];

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + quotes.length) % quotes.length);
  }

  function goToNext() {
    setActiveIndex((current) => (current + 1) % quotes.length);
  }

  return (
    <section className="bg-paper py-12 dark:bg-[#101820]" aria-labelledby="royal-quotes-title">
      <div className="container-page">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-bold text-civic dark:text-emerald-200">من أقوال القيادة الهاشمية</p>
            <h2 id="royal-quotes-title" className="text-2xl font-black text-ink dark:text-white md:text-3xl">
              رؤى ملكية في المشاركة والتحديث
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-ink/65 dark:text-white/70">
            مقتطفات توعوية تعكس أهمية المشاركة المدنية والسياسية في بناء مستقبل الأردن.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft dark:border-white/12 dark:bg-[#16242d]">
          <div className="grid min-h-[360px] gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)] lg:[direction:ltr]">
            <div className="flex min-w-0 flex-col justify-center p-6 text-right [direction:rtl] sm:p-8 lg:p-10">
              <span className="mb-6 grid h-11 w-11 place-items-center rounded-full bg-civic/10 text-civic dark:bg-emerald-200/12 dark:text-emerald-200">
                <Quote className="h-5 w-5" />
              </span>
              <blockquote key={activeIndex} dir="rtl" className="min-w-0 max-w-full overflow-hidden transition duration-300">
                <p className="relative w-full max-w-full whitespace-normal break-words text-right text-base font-semibold leading-8 text-ink [overflow-wrap:anywhere] dark:text-white sm:text-xl sm:leading-10 md:text-2xl md:leading-[3rem]">
                  <span className="invisible" aria-hidden="true">
                    “{activeQuote.quote}”
                  </span>
                  <span className="absolute inset-0">
                    “{displayedQuote}
                    {!reducedMotion && displayedQuote.length < activeQuote.quote.length ? <span className="animate-pulse">|</span> : "”"}
                  </span>
                </p>
                <footer className="mt-7 text-lg font-black text-amber-700 dark:text-amber-200">{activeQuote.author}</footer>
              </blockquote>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" onClick={goToPrevious} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-civic shadow-sm hover:border-civic hover:bg-civic/5 dark:border-white/15 dark:bg-white/8 dark:text-emerald-200 dark:hover:border-emerald-200" aria-label="الاقتباس السابق">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button type="button" onClick={goToNext} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-civic shadow-sm hover:border-civic hover:bg-civic/5 dark:border-white/15 dark:bg-white/8 dark:text-emerald-200 dark:hover:border-emerald-200" aria-label="الاقتباس التالي">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2" aria-label="مؤشرات الاقتباسات">
                  {quotes.map((quote, index) => (
                    <button
                      key={`${quote.author}-${index}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-civic dark:bg-emerald-200" : "w-2.5 bg-ink/20 hover:bg-civic/50 dark:bg-white/24 dark:hover:bg-emerald-200/70"}`}
                      aria-label={`عرض الاقتباس ${index + 1}`}
                      aria-current={index === activeIndex ? "true" : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-[280px] overflow-hidden bg-civic/8 lg:min-h-full">
              {imageFailed ? (
                <div className="grid h-full min-h-[280px] place-items-center bg-civic/10 p-6 text-center text-sm font-semibold text-civic dark:bg-white/8 dark:text-emerald-200">
                  صورة الاقتباس غير متاحة حالياً
                </div>
              ) : (
                <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeQuote.image_url}
                  alt={`صورة ${activeQuote.author}`}
                  className="h-full min-h-[280px] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailedImages((current) => ({ ...current, [activeQuote.image_url]: true }))}
                />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
