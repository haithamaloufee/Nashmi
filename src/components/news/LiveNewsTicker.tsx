"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";
import type { PublicNewsItem } from "@/lib/news/types";

function TickerItems({ items, duplicate = false, copies = 1, measureRef }: { items: PublicNewsItem[]; duplicate?: boolean; copies?: number; measureRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={measureRef} className="news-ticker-set" aria-hidden={duplicate || undefined}>
      {Array.from({ length: copies }, (_, copy) => items.map((item) => (
        <Link
          key={`${duplicate ? "duplicate-" : ""}${copy}-${item.id}`}
          href={`/chat?news=${encodeURIComponent(item.id)}&fresh=1#chat-composer`}
          tabIndex={duplicate || copy > 0 ? -1 : undefined}
          aria-hidden={duplicate || copy > 0 || undefined}
          data-original={!duplicate && copy === 0 ? "true" : undefined}
          className="news-ticker-item focus-ring"
          title={item.summaryAr}
        >
          {item.urgency === "breaking" ? <span className="news-ticker-breaking">عاجل</span> : null}
          <span className="news-ticker-headline">{item.titleAr}</span>
          {item.sources[0]?.publisher ? <span className="news-ticker-source">{item.sources[0].publisher}</span> : null}
        </Link>
      )))}
    </div>
  );
}

export default function LiveNewsTicker({ initialItems }: { initialItems: PublicNewsItem[] }) {
  const pathname = usePathname();
  const [items, setItems] = useState(initialItems.slice(0, 20));
  const firstSetRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(48);
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    const set = firstSetRef.current;
    if (!set) return;
    const measure = () => {
      const naturalWidth = Array.from(set.querySelectorAll('[data-original="true"]')).reduce((width, element) => width + element.getBoundingClientRect().width, 0);
      const windowWidth = set.parentElement?.parentElement?.getBoundingClientRect().width || 0;
      setCopies(naturalWidth > 0 ? Math.max(1, Math.ceil(windowWidth / naturalWidth)) : 1);
      setDuration(Math.max(18, set.getBoundingClientRect().width / 58));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(set);
    if (set.parentElement?.parentElement) observer.observe(set.parentElement.parentElement);
    return () => observer.disconnect();
  }, [items, copies]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const response = await fetch("/api/news/live", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const json = await response.json().catch(() => null);
      if (!cancelled && json?.ok && Array.isArray(json.data?.items)) setItems(json.data.items.slice(0, 20));
    };
    void refresh();
    const interval = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className={`news-ticker-shell ${pathname === "/" ? "news-ticker-home" : "news-ticker-inner"}`} aria-label="آخر الأخبار">
      <div className="news-ticker-label"><Radio aria-hidden="true" /><span className="news-ticker-label-desktop">آخر الأخبار</span><span className="news-ticker-label-mobile">الأخبار</span></div>
      <div className="news-ticker-window" tabIndex={0} aria-label="عناوين الأخبار؛ مرّر أفقياً أو أوقف الحركة بالتركيز">
        <div className="news-ticker-track" style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}>
          <TickerItems items={items} copies={copies} measureRef={firstSetRef} />
          <TickerItems items={items} copies={copies} duplicate />
        </div>
      </div>
    </section>
  );
}
