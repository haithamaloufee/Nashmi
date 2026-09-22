"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock3 } from "lucide-react";
import type { PublicNewsItem } from "@/lib/news/types";

function TickerItems({ items, duplicate = false }: { items: PublicNewsItem[]; duplicate?: boolean }) {
  return (
    <div className="news-ticker-set" aria-hidden={duplicate || undefined}>
      {items.map((item) => (
        <Link
          key={`${duplicate ? "duplicate-" : ""}${item.id}`}
          href={`/chat?news=${encodeURIComponent(item.id)}&fresh=1`}
          tabIndex={duplicate ? -1 : undefined}
          className="news-ticker-item focus-ring"
          title={item.summaryAr}
        >
          {item.urgency === "breaking" ? <span className="news-ticker-breaking">عاجل</span> : null}
          <span>{item.titleAr}</span>
        </Link>
      ))}
    </div>
  );
}

export default function LiveNewsTicker({ initialItems }: { initialItems: PublicNewsItem[] }) {
  const pathname = usePathname();
  const [items, setItems] = useState(initialItems);
  const duration = useMemo(() => Math.max(32, Math.min(110, items.reduce((total, item) => total + item.titleAr.length, 0) * 0.48)), [items]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const response = await fetch("/api/news/live", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const json = await response.json().catch(() => null);
      if (!cancelled && json?.ok && Array.isArray(json.data?.items)) setItems(json.data.items);
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
    <section className={`news-ticker-shell ${pathname === "/" ? "news-ticker-home" : "news-ticker-inner"}`} aria-label="آخر المستجدات">
      <div className="news-ticker-label"><Clock3 aria-hidden="true" /> آخر المستجدات</div>
      <div className="news-ticker-window" tabIndex={0} aria-label="عناوين آخر المستجدات؛ مرّر أفقياً أو أوقف الحركة بالتركيز">
        <div className="news-ticker-track" style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}>
          <TickerItems items={items} />
          <TickerItems items={items} duplicate />
        </div>
      </div>
    </section>
  );
}
